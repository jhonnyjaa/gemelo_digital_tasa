import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Euler, type PerspectiveCamera } from 'three';
import { useStore } from '../store';
import { toWorld } from '../lib/layout';
import { EYE, buildWalkMap, resolve, surfaceAt } from '../lib/walk';
import { actors } from '../lib/sim';
import { keys } from './keys';

const WALK = 3.0;
const RUN = 6.5;

/** Recorrido en primera persona: WASD, ratón (bloqueo de puntero), colisiones con racks/paredes y escaleras transitables. */
export function Walker() {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const cfg = useStore((s) => s.config);
  const layouts = useStore((s) => s.layouts);
  const map = useMemo(() => buildWalkMap(cfg, layouts), [cfg, layouts]);
  const st = useRef({ x: 0, z: 0, y: 0, yaw: 0, pitch: 0, t: 0, v: 0 });
  const eul = useMemo(() => new Euler(0, 0, 0, 'YXZ'), []);

  useEffect(() => {
    const [x, z] = toWorld(cfg, [1350, 480]);
    Object.assign(st.current, { x, z, y: 0, yaw: Math.PI * 0.75, pitch: -0.05, t: 0, v: 0 });
    if (import.meta.env.DEV) (window as unknown as { __walker: unknown }).__walker = st.current;
    const dom = gl.domElement;
    const lockPointer = () => {
      try {
        void Promise.resolve(dom.requestPointerLock()).catch(() => {});
      } catch {
        /* sin bloqueo de puntero: quedan las flechas */
      }
    };
    lockPointer();
    const fov0 = (camera as PerspectiveCamera).fov;
    (camera as PerspectiveCamera).fov = 72;
    (camera as PerspectiveCamera).updateProjectionMatrix();
    const exit = () => {
      const s = st.current;
      const state = useStore.getState();
      if (!state.walk) return;
      state.setWalk(false);
      state.flyTo([s.x, s.y + 1, s.z], [s.x + 10, s.y + 12, s.z + 16]);
    };
    const move = (e: MouseEvent) => {
      if (document.pointerLockElement !== dom) return;
      st.current.yaw -= e.movementX * 0.0022;
      st.current.pitch = Math.max(-1.45, Math.min(1.45, st.current.pitch - e.movementY * 0.0022));
    };
    const lockChange = () => {
      if (document.pointerLockElement !== dom && locked) exit();
      locked = document.pointerLockElement === dom;
    };
    let locked = false;
    const key = (e: KeyboardEvent) => e.key === 'Escape' && exit();
    const click = () => document.pointerLockElement !== dom && lockPointer();
    document.addEventListener('mousemove', move);
    document.addEventListener('pointerlockchange', lockChange);
    window.addEventListener('keydown', key);
    dom.addEventListener('click', click);
    return () => {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('pointerlockchange', lockChange);
      window.removeEventListener('keydown', key);
      dom.removeEventListener('click', click);
      if (document.pointerLockElement === dom) document.exitPointerLock();
      actors.delete('player');
      (camera as PerspectiveCamera).fov = fov0;
      (camera as PerspectiveCamera).updateProjectionMatrix();
    };
  }, [cfg, gl, camera]);

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const s = st.current;
    // flechas ← → giran (alternativa sin ratón)
    s.yaw += ((keys.has('arrowleft') ? 1 : 0) - (keys.has('arrowright') ? 1 : 0)) * 1.8 * dt;
    const f = (keys.has('w') || keys.has('arrowup') ? 1 : 0) - (keys.has('s') || keys.has('arrowdown') ? 1 : 0);
    const r = (keys.has('d') ? 1 : 0) - (keys.has('a') ? 1 : 0);
    const len = Math.hypot(f, r) || 1;
    const sp = (keys.has('shift') ? RUN : WALK) * dt;
    const fx = -Math.sin(s.yaw);
    const fz = -Math.cos(s.yaw);
    const mx = ((fx * f - fz * r) / len) * sp;
    const mz = ((fz * f + fx * r) / len) * sp;

    // cada eje por separado: se desliza por las paredes y no se cae de bordes ni escaleras
    const p = { x: s.x, z: s.z };
    for (const [dx, dz] of [[mx, 0], [0, mz]] as const) {
      if (!dx && !dz) continue;
      const q = { x: p.x + dx, z: p.z + dz };
      resolve(map, q, s.y);
      if (surfaceAt(map, q.x, q.z, s.y) >= s.y - 0.6) {
        p.x = q.x;
        p.z = q.z;
      }
    }
    const moved = Math.hypot(p.x - s.x, p.z - s.z);
    s.x = p.x;
    s.z = p.z;
    s.y += (surfaceAt(map, s.x, s.z, s.y) - s.y) * Math.min(1, dt * 14);
    s.v += (moved / Math.max(dt, 1e-4) - s.v) * Math.min(1, dt * 8);
    s.t += moved * 2.2;

    camera.position.set(s.x, s.y + EYE + Math.sin(s.t) * 0.025 * Math.min(1, s.v / 3), s.z);
    eul.set(s.pitch, s.yaw, 0);
    camera.quaternion.setFromEuler(eul);

    // los montacargas ven al visitante como una persona y ceden el paso
    if (s.y < 1) actors.set('player', { x: s.x, z: s.z, hx: fx, hz: fz, speed: s.v, kind: 'person' });
    else actors.delete('player');
  });

  return null;
}

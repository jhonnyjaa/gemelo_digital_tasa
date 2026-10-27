import { useEffect, useMemo, useRef, type MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import { Group, MeshStandardMaterial, type Mesh } from 'three';
import { useStore } from '../store';
import { toWorld } from '../lib/layout';
import { actors } from '../lib/sim';
import type { Config, ForkliftCfg, PersonCfg, Pt } from '../types';

const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const SKIN = '#d9a77f';

/** Persona de bajo polígono con ciclo de caminata. Eje local +x = frente. */
function Human({ shirt, vest, sit, chair = true, speed }: { shirt: string; vest?: boolean; sit?: boolean; chair?: boolean; speed?: MutableRefObject<number> }) {
  const legL = useRef<Group>(null);
  const legR = useRef<Group>(null);
  const armL = useRef<Group>(null);
  const armR = useRef<Group>(null);
  const phase = useRef(Math.random() * 6);
  const top = vest ? '#c6f000' : shirt;

  useFrame((_, dt) => {
    if (sit || !speed) return;
    const v = speed.current;
    phase.current += dt * v * 5.2;
    const sw = Math.sin(phase.current) * 0.62 * Math.min(1, v / 1.0);
    if (legL.current) legL.current.rotation.z = sw;
    if (legR.current) legR.current.rotation.z = -sw;
    if (armL.current) armL.current.rotation.z = -sw * 0.8;
    if (armR.current) armR.current.rotation.z = sw * 0.8;
  });

  const head = (y: number) => (
    <>
      <mesh position={[0, y, 0]}><sphereGeometry args={[0.105, 10, 8]} /><meshStandardMaterial color={SKIN} roughness={0.7} /></mesh>
      {vest ? (
        <group position={[0, y + 0.03, 0]}>
          <mesh><sphereGeometry args={[0.122, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#f8fafc" roughness={0.4} /></mesh>
          <mesh position={[0.1, -0.02, 0]}><boxGeometry args={[0.1, 0.018, 0.2]} /><meshStandardMaterial color="#f8fafc" roughness={0.4} /></mesh>
        </group>
      ) : (
        <mesh position={[-0.01, y + 0.04, 0]}><sphereGeometry args={[0.112, 10, 6, 0, Math.PI * 2, 0, Math.PI / 1.9]} /><meshStandardMaterial color="#2b2118" roughness={0.9} /></mesh>
      )}
    </>
  );
  const torso = (y: number) => (
    <group position={[0, y, 0]} scale={[0.85, 1, 1.4]}>
      <mesh><capsuleGeometry args={[0.15, 0.34, 3, 8]} /><meshStandardMaterial color={top} roughness={0.7} /></mesh>
      {vest && [-0.05, 0.1].map((o) => (
        <mesh key={o} position={[0, o, 0]}><cylinderGeometry args={[0.158, 0.158, 0.035, 10]} /><meshStandardMaterial color="#e5e7eb" metalness={0.6} roughness={0.25} /></mesh>
      ))}
    </group>
  );

  if (sit) {
    return (
      <group>
        {chair && (
          <group>
            <mesh position={[0.02, 0.46, 0]}><boxGeometry args={[0.46, 0.06, 0.46]} /><meshStandardMaterial color="#1f2937" roughness={0.8} /></mesh>
            <mesh position={[-0.22, 0.75, 0]}><boxGeometry args={[0.06, 0.52, 0.42]} /><meshStandardMaterial color="#1f2937" roughness={0.8} /></mesh>
            <mesh position={[0, 0.24, 0]}><cylinderGeometry args={[0.025, 0.025, 0.4, 8]} /><meshStandardMaterial color="#6b7280" metalness={0.8} /></mesh>
            <mesh position={[0, 0.04, 0]}><cylinderGeometry args={[0.26, 0.26, 0.04, 5]} /><meshStandardMaterial color="#111827" /></mesh>
          </group>
        )}
        {[-0.1, 0.1].map((z) => (
          <group key={z}>
            <mesh position={[0.2, 0.56, z]} rotation={[0, 0, Math.PI / 2]}><capsuleGeometry args={[0.07, 0.36, 2, 6]} /><meshStandardMaterial color="#1f2937" /></mesh>
            <mesh position={[0.42, 0.3, z]}><capsuleGeometry args={[0.06, 0.36, 2, 6]} /><meshStandardMaterial color="#1f2937" /></mesh>
          </group>
        ))}
        {torso(0.9)}
        {head(1.3)}
        {[-0.26, 0.26].map((z) => (
          <group key={z} position={[0, 1.12, z]} rotation={[0, 0, 1.15]}>
            <mesh position={[0, -0.25, 0]}><capsuleGeometry args={[0.045, 0.4, 2, 6]} /><meshStandardMaterial color={shirt} /></mesh>
          </group>
        ))}
      </group>
    );
  }
  return (
    <group>
      {([[-0.1, legL], [0.1, legR]] as const).map(([z, r]) => (
        <group key={z} ref={r} position={[0, 0.92, z]}>
          <mesh position={[0, -0.42, 0]}><capsuleGeometry args={[0.07, 0.7, 2, 6]} /><meshStandardMaterial color="#27313f" roughness={0.8} /></mesh>
          <mesh position={[0.04, -0.88, 0]}><boxGeometry args={[0.22, 0.09, 0.12]} /><meshStandardMaterial color="#111" roughness={0.6} /></mesh>
        </group>
      ))}
      {torso(1.2)}
      {head(1.66)}
      {([[-0.25, armL], [0.25, armR]] as const).map(([z, r]) => (
        <group key={z} ref={r} position={[0, 1.4, z]}>
          <mesh position={[0, -0.28, 0]}><capsuleGeometry args={[0.045, 0.42, 2, 6]} /><meshStandardMaterial color={shirt} roughness={0.8} /></mesh>
          <mesh position={[0, -0.58, 0]}><sphereGeometry args={[0.05, 6, 6]} /><meshStandardMaterial color={SKIN} /></mesh>
        </group>
      ))}
    </group>
  );
}

function Person({ p, cfg }: { p: PersonCfg; cfg: Config }) {
  const root = useRef<Group>(null);
  const speed = useRef(0);
  const base = p.floor ? cfg.upperFloor.height : 0;
  const path = useMemo(() => (p.path ?? []).map((q) => toWorld(cfg, q)), [p.path, cfg]);
  const [sx, sz] = toWorld(cfg, p.pos);
  const faceYaw = useMemo(() => {
    let best = Infinity;
    let yaw = 0;
    for (const d of cfg.upperFloor.desks) {
      const [dx, dz] = toWorld(cfg, [d[0], d[1]]);
      const dist = Math.hypot(dx - sx, dz - sz);
      if (dist < best) {
        best = dist;
        yaw = Math.atan2(-(dz - sz), dx - sx);
      }
    }
    return yaw;
  }, [cfg, sx, sz]);
  const st = useRef({ i: 0, dir: 1, d: 0 });
  const walking = p.pose === 'walk' && path.length > 1;

  useFrame((_, dt) => {
    const g = root.current;
    if (!g || !walking) return;
    const s = st.current;
    const a = path[s.i];
    const b = path[s.i + s.dir];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const hx = (b[0] - a[0]) / len;
    const hz = (b[1] - a[1]) / len;

    // prudencia: espera si un montacargas en movimiento se acerca
    let wait = false;
    if (!p.floor) {
      for (const o of actors.values()) {
        if (o.kind !== 'forklift' || o.speed < 0.3) continue;
        if (Math.hypot(o.x - g.position.x, o.z - g.position.z) < 4.2) wait = true;
      }
    }
    const target = wait ? 0 : 1.15;
    speed.current += (target - speed.current) * Math.min(1, dt * 5);
    s.d += speed.current * dt;
    if (s.d >= len) {
      s.i += s.dir;
      s.d = 0;
      if (s.i + s.dir < 0 || s.i + s.dir >= path.length) s.dir *= -1;
    } else {
      const t = s.d / len;
      g.position.x = a[0] + (b[0] - a[0]) * t;
      g.position.z = a[1] + (b[1] - a[1]) * t;
    }
    g.position.y = base + Math.abs(Math.sin(s.d * 6.2)) * 0.025 * Math.min(1, speed.current);
    g.rotation.y += wrap(Math.atan2(-hz, hx) - g.rotation.y) * Math.min(1, dt * 7);
    if (!p.floor) actors.set(p.id, { x: g.position.x, z: g.position.z, hx, hz, speed: speed.current, kind: 'person' });
  });

  const start: Pt = walking ? path[0] : [sx, sz];
  return (
    <group ref={root} position={[start[0], base, start[1]]} rotation={[0, p.pose === 'sit' ? faceYaw : 0, 0]}>
      <Human shirt={p.shirt} vest={p.vest} sit={p.pose === 'sit'} speed={speed} />
    </group>
  );
}

export function People() {
  const cfg = useStore((s) => s.config);
  const on = useStore((s) => s.toggles.people);
  useEffect(() => () => { for (const [k, a] of actors) if (a.kind === 'person') actors.delete(k); }, [on, cfg]);
  if (!on) return null;
  return <>{cfg.people.map((p) => <Person key={p.id} p={p} cfg={cfg} />)}</>;
}

/** Montacargas Toyota 2.5 tn (esquemático). Ceden el paso a personas y a otros equipos, y giran antes de avanzar. */
function Forklift({ f, cfg }: { f: ForkliftCfg; cfg: Config }) {
  const root = useRef<Group>(null);
  const forks = useRef<Group>(null);
  const pallet = useRef<Group>(null);
  const beacon = useRef<Mesh>(null);
  const spot = useRef<Mesh>(null);
  const speedRef = useRef(0);
  const pts = useMemo(() => f.route.map((r) => toWorld(cfg, r.p)), [f, cfg]);
  const st = useRef({ i: 0, d: 0, wait: 0, carrying: false, lift: 0.08 });
  const beaconMat = useMemo(() => new MeshStandardMaterial({ color: '#ffb000', emissive: '#ff9500', emissiveIntensity: 2 }), []);

  useFrame(({ clock }, dt) => {
    const g = root.current;
    if (!g || pts.length < 2) return;
    const s = st.current;
    const a = pts[s.i];
    const j = (s.i + 1) % pts.length;
    const b = pts[j];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const hx = len > 1e-3 ? (b[0] - a[0]) / len : 1;
    const hz = len > 1e-3 ? (b[1] - a[1]) / len : 0;

    // giro suave: no avanza hasta estar alineado
    const err = Math.abs(wrap(Math.atan2(-hz, hx) - g.rotation.y));
    g.rotation.y += wrap(Math.atan2(-hz, hx) - g.rotation.y) * Math.min(1, dt * 3.5);

    // detección de obstáculos al frente
    let target = f.speed;
    for (const [id, o] of actors) {
      if (id === f.id) continue;
      const dx = o.x - g.position.x;
      const dz = o.z - g.position.z;
      const ahead = dx * hx + dz * hz;
      const lat = Math.abs(dx * hz - dz * hx);
      if (ahead > 0.2 && lat < 1.7) {
        if (ahead < 5.5) target = 0;
        else if (ahead < 10) target = Math.min(target, f.speed * 0.35);
      }
    }
    if (s.wait > 0) {
      target = 0;
      if (speedRef.current < 0.05) s.wait -= dt;
    }
    if (err > 0.35) target = 0;
    speedRef.current += (target - speedRef.current) * Math.min(1, dt * (target < speedRef.current ? 4 : 1.4));

    const adv = speedRef.current * dt;
    s.d += adv;
    if (s.d >= len) {
      s.i = j;
      s.d = 0;
      const stop = f.route[j];
      if (stop.action === 'load') s.carrying = true;
      if (stop.action === 'unload') s.carrying = false;
      s.wait = stop.wait ?? 0;
      g.position.x = b[0];
      g.position.z = b[1];
    } else if (len > 1e-3) {
      const t = s.d / len;
      g.position.x = a[0] + (b[0] - a[0]) * t;
      g.position.z = a[1] + (b[1] - a[1]) * t;
    }

    s.lift += ((s.carrying ? 0.35 : 0.08) - s.lift) * Math.min(1, dt * 3);
    if (forks.current) forks.current.position.y = s.lift;
    if (pallet.current) pallet.current.visible = s.carrying;
    const blink = Math.sin(clock.elapsedTime * 9) > 0;
    beaconMat.emissiveIntensity = blink ? 3 : 0.2;
    if (spot.current) spot.current.visible = speedRef.current > 0.1;
    actors.set(f.id, { x: g.position.x, z: g.position.z, hx, hz, speed: speedRef.current, kind: 'forklift' });
  });

  const orange = '#ff6a13';
  const dark = '#262b33';
  return (
    <group ref={root} position={[pts[0][0], 0, pts[0][1]]}>
      <RoundedBox args={[1.75, 0.5, 1.0]} radius={0.06} position={[-0.05, 0.5, 0]}><meshStandardMaterial color={orange} roughness={0.4} metalness={0.2} /></RoundedBox>
      <RoundedBox args={[0.6, 0.8, 1.0]} radius={0.1} position={[-0.95, 0.65, 0]}><meshStandardMaterial color="#e05a0a" roughness={0.45} metalness={0.2} /></RoundedBox>
      <RoundedBox args={[0.3, 0.55, 0.85]} radius={0.05} position={[0.4, 0.98, 0]}><meshStandardMaterial color={orange} roughness={0.4} /></RoundedBox>
      <mesh position={[-0.3, 0.96, 0]}><boxGeometry args={[0.4, 0.1, 0.42]} /><meshStandardMaterial color="#15181d" roughness={0.9} /></mesh>
      <mesh position={[-0.5, 1.2, 0]}><boxGeometry args={[0.08, 0.5, 0.4]} /><meshStandardMaterial color="#15181d" roughness={0.9} /></mesh>
      <mesh position={[0.28, 1.32, 0]} rotation={[0, 0, -0.9]}><torusGeometry args={[0.12, 0.016, 8, 20]} /><meshStandardMaterial color="#111" /></mesh>
      {[0.3, -0.7].flatMap((x) => [-0.46, 0.46].map((z) => (
        <mesh key={`${x}${z}`} position={[x, 1.5, z]}><boxGeometry args={[0.05, 1.3, 0.05]} /><meshStandardMaterial color={dark} metalness={0.5} /></mesh>
      )))}
      <mesh position={[-0.2, 2.15, 0]}><boxGeometry args={[1.1, 0.04, 1.0]} /><meshStandardMaterial color={dark} metalness={0.5} /></mesh>
      <mesh ref={beacon} position={[-0.7, 2.25, 0]} material={beaconMat}><cylinderGeometry args={[0.07, 0.08, 0.12, 12]} /></mesh>
      <group position={[-0.3, 0.52, 0]} scale={0.95}><Human shirt="#1d4ed8" vest sit chair={false} /></group>
      {[-0.2, 0.2].map((z) => (
        <mesh key={z} position={[0.85, 1.05, z]}><boxGeometry args={[0.09, 2.1, 0.09]} /><meshStandardMaterial color="#454c57" metalness={0.6} roughness={0.4} /></mesh>
      ))}
      <mesh position={[0.85, 2.05, 0]}><boxGeometry args={[0.09, 0.08, 0.5]} /><meshStandardMaterial color="#454c57" metalness={0.6} /></mesh>
      <group ref={forks} position={[0.95, 0.08, 0]}>
        <mesh position={[0, 0.3, 0]}><boxGeometry args={[0.05, 0.55, 0.92]} /><meshStandardMaterial color={dark} metalness={0.6} /></mesh>
        <mesh position={[0.02, 0.85, 0]}><boxGeometry args={[0.04, 0.7, 0.88]} /><meshStandardMaterial color={dark} metalness={0.5} wireframe /></mesh>
        {[-0.3, 0.3].map((z) => (
          <mesh key={z} position={[0.6, 0.03, z]}><boxGeometry args={[1.15, 0.05, 0.11]} /><meshStandardMaterial color="#5a6270" metalness={0.7} roughness={0.35} /></mesh>
        ))}
        <group ref={pallet} position={[0.62, 0.06, 0]} visible={false}>
          <mesh position={[0, 0.07, 0]}><boxGeometry args={[1.05, 0.14, 1.15]} /><meshStandardMaterial color="#b58a52" roughness={0.9} /></mesh>
          {[0, 1].map((r) => [-0.27, 0.27].map((z) => (
            <mesh key={`${r}${z}`} position={[0, 0.14 + 0.25 + r * 0.5, z]}><boxGeometry args={[0.9, 0.48, 0.5]} /><meshStandardMaterial color="#cda76f" roughness={0.85} /></mesh>
          )))}
        </group>
      </group>
      {[0.55, -0.9].flatMap((x, k) => [-0.56, 0.56].map((z) => (
        <group key={`w${x}${z}`} position={[x, k ? 0.23 : 0.3, z]} rotation={[Math.PI / 2, 0, 0]}>
          <mesh><cylinderGeometry args={[k ? 0.23 : 0.3, k ? 0.23 : 0.3, 0.22, 20]} /><meshStandardMaterial color="#14161a" roughness={0.95} /></mesh>
          <mesh position={[0, 0.115 * Math.sign(z), 0]}><cylinderGeometry args={[0.13, 0.13, 0.02, 12]} /><meshStandardMaterial color="#9aa3af" metalness={0.8} roughness={0.3} /></mesh>
        </group>
      )))}
      <mesh position={[-1.26, 0.7, 0.35]}><boxGeometry args={[0.02, 0.1, 0.16]} /><meshStandardMaterial color="#ff2020" emissive="#ff0000" emissiveIntensity={1.5} /></mesh>
      <mesh position={[-1.26, 0.7, -0.35]}><boxGeometry args={[0.02, 0.1, 0.16]} /><meshStandardMaterial color="#ff2020" emissive="#ff0000" emissiveIntensity={1.5} /></mesh>
      {/* luz azul de seguridad proyectada en el piso */}
      <mesh ref={spot} position={[3.4, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <circleGeometry args={[0.28, 24]} />
        <meshBasicMaterial color="#2b7fff" transparent opacity={0.85} toneMapped={false} depthWrite={false} />
      </mesh>
    </group>
  );
}

export function Forklifts() {
  const cfg = useStore((s) => s.config);
  const on = useStore((s) => s.toggles.forklifts);
  useEffect(() => () => { for (const [k, a] of actors) if (a.kind === 'forklift') actors.delete(k); }, [on, cfg]);
  if (!on) return null;
  return <>{cfg.forklifts.map((f) => <Forklift key={f.id} f={f} cfg={cfg} />)}</>;
}

import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { BoxGeometry, Color, EdgesGeometry, InstancedMesh, Mesh, Object3D, type Intersection, type Raycaster, Vector3 } from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { useStore } from '../store';
import { useHover } from '../lib/hover';
import { TYPE_COLOR } from '../types';

const SELECTED = new Color('#ffd23f');
const MATCH = new Color('#ff3d8b');
const GREY = new Color('#7d8794');
const BASE = { BSU: new Color(TYPE_COLOR.BSU), MAT: new Color(TYPE_COLOR.MAT), ACT: new Color(TYPE_COLOR.ACT) };
const EDGE = new EdgesGeometry(new BoxGeometry(1, 1, 1));
const fmt = (n: number) => n.toLocaleString('es-PE', { maximumFractionDigits: 3 });

/** Una caja por (código, ubicación), todas en un solo InstancedMesh. */
export function Items() {
  const boxes = useStore((s) => s.boxes);
  const pl = useStore((s) => s.placements);
  const mask = useStore((s) => s.mask);
  const selected = useStore((s) => s.selected);
  const typeFilter = useStore((s) => s.typeFilter);
  const upperOn = useStore((s) => s.toggles.upperMezz);
  const select = useStore((s) => s.select);
  const setHover = useHover((s) => s.set);
  const ref = useRef<InstancedMesh>(null);
  const n = boxes.length;
  // con muchas cajas, geometría mínima (12 triángulos); con pocas, bordes redondeados
  const geo = useMemo(() => (n > 4000 ? new BoxGeometry(1, 1, 1) : new RoundedBoxGeometry(1, 1, 1, 1, 0.07)), [n > 4000]); // eslint-disable-line react-hooks/exhaustive-deps
  const lastMove = useRef(0);
  const visible = useRef<Uint8Array>(new Uint8Array(0));
  const plRef = useRef(pl);
  plRef.current = pl;

  /** Picking propio: rayo contra cada caja orientada (slab test). Evita recorrer miles de instancias con geometría. */
  const raycast = useMemo(() => {
    const p = new Vector3();
    return function (this: InstancedMesh, ray: Raycaster, hits: Intersection[]) {
      const pl = plRef.current;
      const vis = visible.current;
      const o = ray.ray.origin;
      const d = ray.ray.direction;
      let best = Infinity;
      let bi = -1;
      for (let i = 0; i < vis.length; i++) {
        if (!vis[i]) continue;
        const k = i * 3;
        const ox = o.x - pl.pos[k];
        const oy = o.y - pl.pos[k + 1];
        const oz = o.z - pl.pos[k + 2];
        let lx = ox;
        let lz = oz;
        let dx = d.x;
        let dz = d.z;
        const yaw = pl.yaw[i];
        if (yaw !== 0) {
          const c = Math.cos(yaw);
          const s = Math.sin(yaw);
          lx = ox * c - oz * s;
          lz = ox * s + oz * c;
          dx = d.x * c - d.z * s;
          dz = d.x * s + d.z * c;
        }
        const hx = pl.size[k] / 2;
        const hy = pl.size[k + 1] / 2;
        const hz = pl.size[k + 2] / 2;
        let t0 = 0;
        let t1 = Infinity;
        // eje x
        if (Math.abs(dx) < 1e-9) { if (lx < -hx || lx > hx) continue; } else {
          let a = (-hx - lx) / dx;
          let b = (hx - lx) / dx;
          if (a > b) { const t = a; a = b; b = t; }
          if (a > t0) t0 = a;
          if (b < t1) t1 = b;
          if (t0 > t1) continue;
        }
        if (Math.abs(d.y) < 1e-9) { if (oy < -hy || oy > hy) continue; } else {
          let a = (-hy - oy) / d.y;
          let b = (hy - oy) / d.y;
          if (a > b) { const t = a; a = b; b = t; }
          if (a > t0) t0 = a;
          if (b < t1) t1 = b;
          if (t0 > t1) continue;
        }
        if (Math.abs(dz) < 1e-9) { if (lz < -hz || lz > hz) continue; } else {
          let a = (-hz - lz) / dz;
          let b = (hz - lz) / dz;
          if (a > b) { const t = a; a = b; b = t; }
          if (a > t0) t0 = a;
          if (b < t1) t1 = b;
          if (t0 > t1) continue;
        }
        if (t0 < best && t0 >= ray.near && t0 <= ray.far) {
          best = t0;
          bi = i;
        }
      }
      if (bi >= 0) hits.push({ distance: best, point: p.copy(d).multiplyScalar(best).add(o).clone(), object: this, instanceId: bi });
    };
  }, []);

  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new Object3D();
    const vis = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      const visible = typeFilter[boxes[i].type] && (upperOn || !pl.upper[i]);
      vis[i] = visible ? 1 : 0;
      if (!visible) o.scale.set(0, 0, 0);
      else o.scale.set(pl.size[i * 3], pl.size[i * 3 + 1], pl.size[i * 3 + 2]);
      o.position.set(pl.pos[i * 3], pl.pos[i * 3 + 1], pl.pos[i * 3 + 2]);
      o.rotation.set(0, pl.yaw[i], 0);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    }
    visible.current = vis;
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
  }, [boxes, pl, n, typeFilter, upperOn]);

  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const c = new Color();
    for (let i = 0; i < n; i++) {
      c.copy(BASE[boxes[i].type]);
      const v = 0.82 + ((i * 2654435761) % 1000) / 1000 * 0.3; // variación sutil por caja
      c.multiplyScalar(v);
      if (mask) c.copy(mask[i] ? MATCH : c.lerp(GREY, 0.82));
      if (i === selected) c.copy(SELECTED);
      m.setColorAt(i, c);
    }
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [boxes, n, mask, selected]);

  if (!n) return null;
  return (
    <instancedMesh
      key={n}
      ref={ref}
      args={[geo, undefined, n]}
      frustumCulled={false}
      raycast={raycast}
      onClick={(e) => {
        e.stopPropagation();
        if (e.instanceId !== undefined) select(e.instanceId);
      }}
      onPointerMove={(e) => {
        e.stopPropagation();
        const t = performance.now();
        if (t - lastMove.current < 50) return;
        lastMove.current = t;
        setHover(e.instanceId ?? null);
      }}
      onPointerOut={() => setHover(null)}
    >
      <meshStandardMaterial roughness={0.62} metalness={0.02} />
    </instancedMesh>
  );
}

function Outline({ id, color, grow = 1.12 }: { id: number; color: string; grow?: number }) {
  const pl = useStore((s) => s.placements);
  return (
    <lineSegments
      geometry={EDGE}
      position={[pl.pos[id * 3], pl.pos[id * 3 + 1], pl.pos[id * 3 + 2]]}
      rotation={[0, pl.yaw[id], 0]}
      scale={[pl.size[id * 3] * grow, pl.size[id * 3 + 1] * grow, pl.size[id * 3 + 2] * grow]}
    >
      <lineBasicMaterial color={color} toneMapped={false} />
    </lineSegments>
  );
}

/** Contorno al pasar el mouse, rayo vertical sobre la selección y tooltip */
export function Highlights() {
  const hover = useHover((s) => s.id);
  const selected = useStore((s) => s.selected);
  const boxes = useStore((s) => s.boxes);
  const pl = useStore((s) => s.placements);
  const beam = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    if (beam.current) beam.current.scale.x = beam.current.scale.z = 1 + Math.sin(clock.elapsedTime * 5) * 0.35;
  });
  const hb = hover !== null && hover !== selected ? boxes[hover] : null;
  return (
    <>
      {hover !== null && hover !== selected && <Outline id={hover} color="#ffffff" />}
      {selected !== null && (
        <>
          <Outline id={selected} color="#ffd23f" grow={1.25} />
          <mesh ref={beam} position={[pl.pos[selected * 3], pl.pos[selected * 3 + 1] + 4, pl.pos[selected * 3 + 2]]}>
            <cylinderGeometry args={[0.03, 0.03, 8, 8]} />
            <meshBasicMaterial color="#ffd23f" transparent opacity={0.55} depthWrite={false} toneMapped={false} />
          </mesh>
        </>
      )}
      {hb && hover !== null && (
        <Html position={[pl.pos[hover * 3], pl.pos[hover * 3 + 1] + 0.7, pl.pos[hover * 3 + 2]]} center style={{ pointerEvents: 'none' }} zIndexRange={[20, 0]}>
          <div className="whitespace-nowrap rounded-lg glass rounded-lg px-2.5 py-1.5 text-[11px] text-white">
            <b className="font-semibold">{hb.code}</b> <span className="text-sky-300">{hb.loc}</span>
            <div className="max-w-56 truncate text-slate-400">{hb.desc}</div>
            <div className="text-slate-400">{fmt(hb.qty)} {hb.um}</div>
          </div>
        </Html>
      )}
    </>
  );
}

import { Suspense, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard, Text } from '@react-three/drei';
import { DoubleSide, Mesh, MeshStandardMaterial, Shape, Vector2, Vector3 } from 'three';
import interFont from '@fontsource/inter/files/inter-latin-600-normal.woff?url';
import { useStore } from '../store';
import { rectWorld, toWorld } from '../lib/layout';
import { Boxes, pushBox } from './Boxes';
import type { Config, Pt } from '../types';

/** Pared que se vuelve casi transparente cuando la cámara está del lado de afuera (vista tipo casa de muñecas). */
function Wall({ a, b, h, n, color }: { a: Pt; b: Pt; h: number; n: Pt; color: string }) {
  const ref = useRef<Mesh>(null);
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  const len = Math.hypot(dx, dz);
  const mid = new Vector3((a[0] + b[0]) / 2, h / 2, (a[1] + b[1]) / 2);
  const mat = useMemo(() => new MeshStandardMaterial({ color, roughness: 0.85, transparent: true }), [color]);
  useFrame(({ camera }, dt) => {
    const outside = (camera.position.x - mid.x) * n[0] + (camera.position.z - mid.z) * n[1] > 0;
    const target = outside ? 0.07 : 1;
    mat.opacity += (target - mat.opacity) * Math.min(1, dt * 6);
    mat.depthWrite = mat.opacity > 0.9;
    if (ref.current) ref.current.visible = mat.opacity > 0.02;
  });
  return (
    <mesh ref={ref} position={mid} rotation={[0, -Math.atan2(dz, dx), 0]} material={mat}>
      <boxGeometry args={[len, h, 0.35]} />
    </mesh>
  );
}

function Walls({ cfg }: { cfg: Config }) {
  const theme = useStore((s) => s.theme);
  const { segs, h } = useMemo(() => {
    const pts = cfg.building.outline.map((p) => toWorld(cfg, p));
    const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
    const cz = pts.reduce((s, p) => s + p[1], 0) / pts.length;
    const segs = pts.map((a, i) => {
      const b = pts[(i + 1) % pts.length];
      let n: Pt = [-(b[1] - a[1]), b[0] - a[0]];
      const l = Math.hypot(n[0], n[1]) || 1;
      n = [n[0] / l, n[1] / l];
      if (n[0] * ((a[0] + b[0]) / 2 - cx) + n[1] * ((a[1] + b[1]) / 2 - cz) < 0) n = [-n[0], -n[1]];
      return { a, b, n };
    });
    return { segs, h: cfg.building.wallHeight };
  }, [cfg]);
  return <>{segs.map((s, i) => <Wall key={i} {...s} h={h} color={theme === 'dark' ? '#cfd6de' : '#f1f4f8'} />)}</>;
}

/** Cubierta con luminarias LED high-bay (opcional) */
function Roof({ cfg }: { cfg: Config }) {
  const { shape, lights } = useMemo(() => {
    const pts = cfg.building.outline.map((p) => toWorld(cfg, p));
    const shape = new Shape(pts.map(([x, z]) => new Vector2(x, -z)));
    const inside = (x: number, z: number) => {
      let c = false;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const [xi, zi] = pts[i];
        const [xj, zj] = pts[j];
        if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c;
      }
      return c;
    };
    const lights: number[] = [];
    for (let x = -56; x < 58; x += 8) for (let z = -16; z < 24; z += 8) if (inside(x, z) && inside(x + 3, z) && inside(x, z + 3)) pushBox(lights, x, cfg.building.wallHeight - 0.4, z, 3, 0.1, 0.35);
    return { shape, lights };
  }, [cfg]);
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, cfg.building.wallHeight, 0]}>
        <shapeGeometry args={[shape]} />
        <meshStandardMaterial color="#aeb6c0" side={DoubleSide} roughness={0.9} transparent opacity={0.94} />
      </mesh>
      <Boxes data={lights} color="#fff" emissive="#fff6e0" emissiveIntensity={4} />
    </group>
  );
}

/** Mezanine: cubierta metálica, columnas, barandas y la escalera de acceso */
function MezzStructure({ cfg }: { cfg: Config }) {
  const d = rectWorld(cfg, cfg.mezzDeck.rect);
  const H = cfg.mezzDeck.height;
  const { posts, rails } = useMemo(() => {
    const posts: number[] = [];
    const rails: number[] = [];
    const x0 = d.cx - d.w / 2;
    const x1 = d.cx + d.w / 2;
    const z0 = d.cz - d.d / 2;
    const z1 = d.cz + d.d / 2;
    for (let z = z0 + 0.5; z <= z1; z += 3.6) for (const x of [x0 + 0.15, x1 - 0.15]) pushBox(posts, x, (H - 0.15) / 2, z, 0.18, H - 0.15, 0.18);
    // barandas perimetrales (con abertura en la escalera: borde oeste, z ≈ 570-590 px)
    const [, gz0] = toWorld(cfg, [0, 558]);
    const [, gz1] = toWorld(cfg, [0, 584]);
    const yTop = H + 1.05;
    const yMid = H + 0.55;
    const edge = (ax: number, az: number, bx: number, bz: number) => {
      const len = Math.hypot(bx - ax, bz - az);
      const yaw = -Math.atan2(bz - az, bx - ax);
      for (const y of [yTop, yMid]) pushBox(rails, (ax + bx) / 2, y, (az + bz) / 2, len, 0.05, 0.05, yaw);
      const n = Math.max(1, Math.round(len / 2));
      for (let i = 0; i <= n; i++) pushBox(rails, ax + ((bx - ax) * i) / n, H + 0.52, az + ((bz - az) * i) / n, 0.05, 1.04, 0.05);
    };
    edge(x0, z0, x1, z0);
    edge(x0, z1, x1, z1);
    edge(x1, z0, x1, z1);
    edge(x0, z0, x0, gz0);
    edge(x0, gz1, x0, z1);
    return { posts, rails };
  }, [d.cx, d.cz, d.w, d.d, H, cfg]);
  return (
    <group>
      <mesh position={[d.cx, H - 0.08, d.cz]}>
        <boxGeometry args={[d.w, 0.16, d.d]} />
        <meshStandardMaterial color="#8d97a3" roughness={0.55} metalness={0.4} />
      </mesh>
      <Boxes data={posts} color="#4a5568" metal={0.5} rough={0.5} />
      <Boxes data={rails} color="#f5c518" rough={0.45} />
    </group>
  );
}

function Stairs({ cfg }: { cfg: Config }) {
  const { steps, side, rail } = useMemo(() => {
    const steps: number[] = [];
    const side: number[] = [];
    const rail: number[] = [];
    for (const s of cfg.stairs) {
      const [ax, az] = toWorld(cfg, s.from);
      const [bx, bz] = toWorld(cfg, s.to);
      const run = Math.hypot(bx - ax, bz - az);
      const yaw = -Math.atan2(bz - az, bx - ax);
      const w = s.width * cfg.scale;
      const n = Math.round(s.height / 0.19);
      const tread = run / n;
      const px = -(bz - az) / run;
      const pz = (bx - ax) / run;
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n;
        pushBox(steps, ax + (bx - ax) * t, ((i + 1) * s.height) / n - 0.02, az + (bz - az) * t, tread * 1.02, 0.04, w, yaw);
      }
      const ang = Math.atan2(s.height, run);
      const slope = Math.hypot(run, s.height);
      for (const sd of [-1, 1]) {
        pushBox(side, (ax + bx) / 2 + px * sd * (w / 2), s.height / 2 - 0.1, (az + bz) / 2 + pz * sd * (w / 2), slope, 0.28, 0.05, yaw, ang);
        pushBox(rail, (ax + bx) / 2 + px * sd * (w / 2), s.height / 2 + 0.9, (az + bz) / 2 + pz * sd * (w / 2), slope, 0.05, 0.05, yaw, ang);
      }
    }
    return { steps, side, rail };
  }, [cfg]);
  return (
    <group>
      <Boxes data={steps} color="#9aa4b0" metal={0.5} rough={0.5} />
      <Boxes data={side} color="#4a5568" metal={0.4} />
      <Boxes data={rail} color="#f5c518" />
    </group>
  );
}

/** Segundo piso de oficinas: losa, mamparas de vidrio, escritorios con monitor */
function Offices({ cfg }: { cfg: Config }) {
  const uf = cfg.upperFloor;
  const slab = rectWorld(cfg, uf.rect);
  const H = uf.height;
  const { glass, frames, desk, mon, floors } = useMemo(() => {
    const glass: number[] = [];
    const frames: number[] = [];
    const desk: number[] = [];
    const mon: number[] = [];
    const floors = uf.rooms.map((rm) => ({ ...rectWorld(cfg, rm.rect), color: rm.color, name: rm.name }));
    for (const r of floors) {
      const x0 = r.cx - r.w / 2;
      const x1 = r.cx + r.w / 2;
      const z0 = r.cz - r.d / 2;
      const z1 = r.cz + r.d / 2;
      const hh = 2.7;
      pushBox(glass, r.cx, H + hh / 2, z0, r.w, hh, 0.04);
      pushBox(glass, r.cx, H + hh / 2, z1, r.w, hh, 0.04);
      pushBox(glass, x0, H + hh / 2, r.cz, 0.04, hh, r.d);
      pushBox(glass, x1, H + hh / 2, r.cz, 0.04, hh, r.d);
      for (const [x, z] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) pushBox(frames, x, H + hh / 2, z, 0.07, hh, 0.07);
      for (const [cx, cz, w, d] of [[r.cx, z0, r.w, 0.07], [r.cx, z1, r.w, 0.07], [x0, r.cz, 0.07, r.d], [x1, r.cz, 0.07, r.d]]) pushBox(frames, cx, H + hh, cz, w, 0.07, d);
    }
    for (const [x, y, rot, w, d] of uf.desks) {
      const [wx, wz] = toWorld(cfg, [x, y]);
      const yaw = -(rot * Math.PI) / 180;
      const ww = w * cfg.scale;
      const dd = d * cfg.scale;
      pushBox(desk, wx, H + 0.74, wz, ww, 0.04, dd, yaw);
      const cos = Math.cos(yaw);
      const sin = Math.sin(yaw);
      for (const sx of [-1, 1]) pushBox(desk, wx + cos * sx * (ww / 2 - 0.05), H + 0.37, wz - sin * sx * (ww / 2 - 0.05), 0.05, 0.74, dd - 0.1, yaw);
      if (ww < 3) pushBox(mon, wx, H + 1.0, wz, 0.5, 0.3, 0.03, yaw);
    }
    return { glass, frames, desk, mon, floors };
  }, [cfg, uf, H]);
  return (
    <group>
      <mesh position={[slab.cx, H - 0.12, slab.cz]}>
        <boxGeometry args={[slab.w, 0.24, slab.d]} />
        <meshStandardMaterial color="#d3d9e0" roughness={0.7} />
      </mesh>
      {floors.map((r) => (
        <group key={r.name}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[r.cx, H + 0.005, r.cz]}>
            <planeGeometry args={[r.w, r.d]} />
            <meshStandardMaterial color={r.color} roughness={0.95} transparent opacity={0.35} />
          </mesh>
          <Suspense fallback={null}>
            <Billboard position={[r.cx, H + 3.3, r.cz]}>
              <Text font={interFont} fontSize={0.4} color="#fff" outlineWidth={0.04} outlineColor="#0b1220" anchorX="center">{r.name}</Text>
            </Billboard>
          </Suspense>
        </group>
      ))}
      <Boxes data={glass} color="#9fd8ff" opacity={0.16} rough={0.05} metal={0.6} />
      <Boxes data={frames} color="#2a3441" metal={0.7} rough={0.4} />
      <Boxes data={desk} color="#a98558" rough={0.6} />
      <Boxes data={mon} color="#0c0f14" rough={0.3} emissive="#102a43" emissiveIntensity={0.6} />
    </group>
  );
}

export function Building() {
  const cfg = useStore((s) => s.config);
  const roof = useStore((s) => s.toggles.roof);
  const upper = useStore((s) => s.toggles.upperMezz);
  const walls = useStore((s) => s.toggles.walls);
  return (
    <group>
      {walls && <Walls cfg={cfg} />}
      {roof && <Roof cfg={cfg} />}
      {upper && <MezzStructure cfg={cfg} />}
      <Stairs cfg={cfg} />
      <Offices cfg={cfg} />
    </group>
  );
}

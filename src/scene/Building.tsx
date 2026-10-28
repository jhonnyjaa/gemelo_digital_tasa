import { Suspense, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard, Text } from '@react-three/drei';
import { BoxGeometry, DoubleSide, MeshStandardMaterial, Shape, Vector2 } from 'three';
import interFont from '@fontsource/inter/files/inter-latin-600-normal.woff?url';
import { useStore } from '../store';
import { rectWorld, toWorld } from '../lib/layout';
import { buildWorld, type RoomWalls, type SideWalls } from '../lib/walls';
import { Boxes, pushBox } from './Boxes';
import type { Config } from '../types';

const UNIT = new BoxGeometry(1, 1, 1);

/** Pared (tramo del perímetro o lado de un cuarto): se vuelve casi transparente cuando la cámara está del lado de afuera. */
function useFade(mid: [number, number], n: [number, number], mats: { m: MeshStandardMaterial; out: number; inn: number }[]) {
  useFrame(({ camera }, dt) => {
    const walking = useStore.getState().walk;
    const outside = !walking && (camera.position.x - mid[0]) * n[0] + (camera.position.z - mid[1]) * n[1] > 0;
    const k = Math.min(1, dt * 6);
    for (const { m, out, inn } of mats) {
      m.opacity += ((outside ? out : inn) - m.opacity) * k;
      m.depthWrite = m.opacity > 0.9;
    }
  });
}

function Perimeter({ cfg }: { cfg: Config }) {
  const theme = useStore((s) => s.theme);
  const world = useMemo(() => buildWorld(cfg), [cfg]);
  return (
    <>
      {world.outline.map((s, i) => (
        <PerimeterWall key={i} a={s.a} b={s.b} n={s.n} h={cfg.building.wallHeight} color={theme === 'dark' ? '#cfd6de' : '#f1f4f8'} />
      ))}
    </>
  );
}

function PerimeterWall({ a, b, n, h, color }: { a: [number, number]; b: [number, number]; n: [number, number]; h: number; color: string }) {
  const mid: [number, number] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const mat = useMemo(() => new MeshStandardMaterial({ color, roughness: 0.85, transparent: true }), [color]);
  useFade(mid, n, [{ m: mat, out: 0.07, inn: 1 }]);
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  return <mesh geometry={UNIT} material={mat} position={[mid[0], h / 2, mid[1]]} scale={[Math.hypot(dx, dz), h, 0.35]} rotation={[0, -Math.atan2(dz, dx), 0]} />;
}

function Side({ side, wall }: { side: SideWalls; wall: string }) {
  const mats = useMemo(
    () => ({
      solid: new MeshStandardMaterial({ color: wall, roughness: 0.8, transparent: true }),
      trim: new MeshStandardMaterial({ color: '#2a3441', roughness: 0.4, metalness: 0.6, transparent: true }),
      door: new MeshStandardMaterial({ color: '#8a5a33', roughness: 0.6, transparent: true }),
      glass: new MeshStandardMaterial({ color: '#9fd8ff', roughness: 0.05, metalness: 0.5, transparent: true, opacity: 0.2, depthWrite: false }),
    }),
    [wall],
  );
  useFade(side.mid, side.n, [
    { m: mats.solid, out: 0.07, inn: 1 },
    { m: mats.trim, out: 0.2, inn: 1 },
    { m: mats.door, out: 0.2, inn: 1 },
    { m: mats.glass, out: 0.04, inn: 0.2 },
  ]);
  return (
    <>
      {side.pieces.map((p, i) => (
        <mesh key={i} geometry={UNIT} material={mats[p.k]} position={[p.x, p.y, p.z]} scale={[p.sx, p.sy, p.sz]} rotation={[0, p.yaw, 0]} />
      ))}
    </>
  );
}

function Room({ room, wall }: { room: RoomWalls; wall: string }) {
  return (
    <group>
      {room.sides.map((s, i) => <Side key={i} side={s} wall={wall} />)}
      {room.label && (
        <Suspense fallback={null}>
          <Billboard position={[room.cx, room.base + room.h + 0.45, room.cz]}>
            <Text font={interFont} fontSize={0.3} color="#fff" outlineWidth={0.03} outlineColor="#0b1220" anchorX="center">{room.name}</Text>
          </Billboard>
        </Suspense>
      )}
    </group>
  );
}

/** Techo y luminarias LED high-bay (opcional) */
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

/** Mezanine: cubierta metálica, columnas y barandas */
function MezzStructure({ cfg }: { cfg: Config }) {
  const world = useMemo(() => buildWorld(cfg), [cfg]);
  const d = rectWorld(cfg, cfg.mezzDeck.rect);
  const H = cfg.mezzDeck.height;
  const posts = useMemo(() => {
    const out: number[] = [];
    const x0 = d.cx - d.w / 2;
    const x1 = d.cx + d.w / 2;
    const z0 = d.cz - d.d / 2;
    const z1 = d.cz + d.d / 2;
    for (let z = z0 + 0.5; z <= z1; z += 3.6) for (const x of [x0 + 0.15, x1 - 0.15]) pushBox(out, x, (H - 0.15) / 2, z, 0.18, H - 0.15, 0.18);
    return out;
  }, [d.cx, d.cz, d.w, d.d, H]);
  return (
    <group>
      <mesh position={[d.cx, H - 0.08, d.cz]}>
        <boxGeometry args={[d.w, 0.16, d.d]} />
        <meshStandardMaterial color="#8d97a3" roughness={0.55} metalness={0.4} />
      </mesh>
      <Boxes data={posts} color="#4a5568" metal={0.5} rough={0.5} />
      <Boxes data={world.deckRails} color="#f5c518" rough={0.45} />
      <Boxes data={world.deckPosts} color="#f5c518" rough={0.45} />
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

/** Escritorios / mostradores: [x, y, rotación°, ancho px, fondo px] */
function furniture(cfg: Config, list: [number, number, number, number, number][], base: number) {
  const desk: number[] = [];
  const mon: number[] = [];
  for (const [x, y, rot, w, d] of list) {
    const [wx, wz] = toWorld(cfg, [x, y]);
    const yaw = -(rot * Math.PI) / 180;
    const ww = w * cfg.scale;
    const dd = d * cfg.scale;
    pushBox(desk, wx, base + 0.74, wz, ww, 0.04, dd, yaw);
    const cos = Math.cos(yaw);
    const sin = Math.sin(yaw);
    for (const sx of [-1, 1]) pushBox(desk, wx + cos * sx * (ww / 2 - 0.05), base + 0.37, wz - sin * sx * (ww / 2 - 0.05), 0.05, 0.74, dd - 0.1, yaw);
    if (ww < 3) pushBox(mon, wx, base + 1.0, wz, 0.5, 0.3, 0.03, yaw);
  }
  return { desk, mon };
}

/** Bloque de oficinas: losa del segundo piso, pisos coloreados, mobiliario y barandas */
function Offices({ cfg }: { cfg: Config }) {
  const uf = cfg.upperFloor;
  const slab = rectWorld(cfg, uf.rect);
  const H = uf.height;
  const alero = uf.alero ? rectWorld(cfg, uf.alero) : null;
  const world = useMemo(() => buildWorld(cfg), [cfg]);
  const up = useMemo(() => furniture(cfg, uf.desks, H), [cfg, uf, H]);
  const ground = useMemo(() => furniture(cfg, cfg.groundDesks ?? [], 0), [cfg]);
  const floors = useMemo(() => uf.rooms.map((rm) => ({ ...rectWorld(cfg, rm.rect), color: rm.color, name: rm.name })), [cfg, uf]);
  return (
    <group>
      <mesh position={[slab.cx, H - 0.12, slab.cz]}>
        <boxGeometry args={[slab.w, 0.24, slab.d]} />
        <meshStandardMaterial color="#d3d9e0" roughness={0.7} />
      </mesh>
      {alero && (
        <mesh position={[alero.cx, H - 0.12, alero.cz]}>
          <boxGeometry args={[alero.w, 0.24, alero.d]} />
          <meshStandardMaterial color="#d3d9e0" roughness={0.7} />
        </mesh>
      )}
      {floors.map((r) => (
        <mesh key={r.name} rotation={[-Math.PI / 2, 0, 0]} position={[r.cx, H + 0.005, r.cz]}>
          <planeGeometry args={[r.w, r.d]} />
          <meshStandardMaterial color={r.color} roughness={0.95} transparent opacity={0.3} />
        </mesh>
      ))}
      <Boxes data={up.desk} color="#a98558" rough={0.6} />
      <Boxes data={up.mon} color="#0c0f14" rough={0.3} emissive="#102a43" emissiveIntensity={0.6} />
      <Boxes data={ground.desk} color="#c9ccd1" rough={0.5} />
      <Boxes data={ground.mon} color="#0c0f14" rough={0.3} emissive="#102a43" emissiveIntensity={0.6} />
      <Boxes data={world.rails} color="#f5c518" rough={0.45} />
      <Boxes data={world.posts} color="#f5c518" rough={0.45} />
    </group>
  );
}

function Rooms({ cfg }: { cfg: Config }) {
  const theme = useStore((s) => s.theme);
  const offices = useStore((s) => s.toggles.offices);
  const world = useMemo(() => buildWorld(cfg), [cfg]);
  const wall = theme === 'dark' ? '#d5dbe3' : '#f7f8fa';
  return (
    <>
      {world.rooms.filter((r) => offices || !r.id.startsWith('up:')).map((r) => <Room key={r.id} room={r} wall={wall} />)}
    </>
  );
}

export function Building() {
  const cfg = useStore((s) => s.config);
  const roof = useStore((s) => s.toggles.roof);
  const upper = useStore((s) => s.toggles.upperMezz);
  const walls = useStore((s) => s.toggles.walls);
  const offices = useStore((s) => s.toggles.offices);
  return (
    <group>
      {walls && <Perimeter cfg={cfg} />}
      {roof && <Roof cfg={cfg} />}
      {upper && <MezzStructure cfg={cfg} />}
      <Stairs cfg={cfg} />
      {offices && <Offices cfg={cfg} />}
      <Rooms cfg={cfg} />
    </group>
  );
}

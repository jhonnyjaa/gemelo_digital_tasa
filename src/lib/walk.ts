import type { Config } from '../types';
import { rectWorld, toWorld, type RackLayout } from './layout';
import { buildWorld, type Solid } from './walls';

export const RADIUS = 0.28;
export const EYE = 1.68;
const STEP = 0.5;

interface StairS {
  ax: number;
  az: number;
  ux: number;
  uz: number;
  run: number;
  hw: number;
  h: number;
}
interface Plat {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
  h: number;
}

export interface WalkMap {
  solids: Solid[];
  stairs: StairS[];
  plats: Plat[];
}

/** Obstáculos y superficies caminables de la config actual */
export function buildWalkMap(cfg: Config, layouts: Map<number, RackLayout>): WalkMap {
  const world = buildWorld(cfg);
  const solids: Solid[] = [...world.solids];
  for (const rl of layouts.values()) {
    for (const sg of rl.segs) {
      const m = (sg.x0 + sg.x1) / 2;
      solids.push({
        x: rl.ox + rl.dx * m,
        z: rl.oz + rl.dz * m,
        hx: (sg.x1 - sg.x0) / 2,
        hz: rl.depth / 2,
        yaw: rl.yaw,
        y0: rl.baseY,
        y1: rl.baseY + rl.levels * rl.levelH,
      });
    }
  }
  const stairs: StairS[] = [];
  for (const s of cfg.stairs) {
    const [ax, az] = toWorld(cfg, s.from);
    const [bx, bz] = toWorld(cfg, s.to);
    const run = Math.hypot(bx - ax, bz - az);
    const ux = (bx - ax) / run;
    const uz = (bz - az) / run;
    const hw = (s.width * cfg.scale) / 2;
    stairs.push({ ax, az, ux, uz, run, hw, h: s.height });
    // laterales: impiden entrar a la escalera por el costado
    for (const sd of [-1, 1]) {
      solids.push({
        x: (ax + bx) / 2 - uz * sd * (hw + 0.05),
        z: (az + bz) / 2 + ux * sd * (hw + 0.05),
        hx: run / 2,
        hz: 0.05,
        yaw: -Math.atan2(uz, ux),
        y0: 0,
        y1: s.height + 1,
      });
    }
  }
  const plats: Plat[] = [];
  const platRects: [[number, number, number, number], number][] = [[cfg.upperFloor.rect, cfg.upperFloor.height], [cfg.mezzDeck.rect, cfg.mezzDeck.height]];
  if (cfg.upperFloor.alero) platRects.push([cfg.upperFloor.alero, cfg.upperFloor.height]);
  for (const [rect, h] of platRects) {
    const r = rectWorld(cfg, rect);
    plats.push({ x0: r.cx - r.w / 2, x1: r.cx + r.w / 2, z0: r.cz - r.d / 2, z1: r.cz + r.d / 2, h });
  }
  return { solids, stairs, plats };
}

/** Altura del piso bajo (x,z) para alguien parado a altura y: la superficie más alta que se puede pisar. */
export function surfaceAt(m: WalkMap, x: number, z: number, y: number): number {
  let best = 0;
  const lim = y + STEP;
  for (const s of m.stairs) {
    const dx = x - s.ax;
    const dz = z - s.az;
    const t = (dx * s.ux + dz * s.uz) / s.run;
    const lat = Math.abs(dx * -s.uz + dz * s.ux);
    if (t >= 0 && t <= 1 && lat <= s.hw) {
      const h = s.h * t;
      if (h <= lim && h > best) best = h;
    }
  }
  for (const p of m.plats) if (x >= p.x0 && x <= p.x1 && z >= p.z0 && z <= p.z1 && p.h <= lim && p.h > best) best = p.h;
  return best;
}

/** Empuja el círculo fuera de las cajas con las que se cruza (a la altura y). */
export function resolve(m: WalkMap, p: { x: number; z: number }, y: number) {
  const lo = y + 0.25;
  const hi = y + 1.7;
  for (let pass = 0; pass < 2; pass++) {
    for (const s of m.solids) {
      if (s.y1 < lo || s.y0 > hi) continue;
      const c = Math.cos(s.yaw);
      const sn = Math.sin(s.yaw);
      const rx = p.x - s.x;
      const rz = p.z - s.z;
      const lx = rx * c - rz * sn;
      const lz = rx * sn + rz * c;
      if (Math.abs(lx) > s.hx + RADIUS || Math.abs(lz) > s.hz + RADIUS) continue;
      const cx = Math.max(-s.hx, Math.min(s.hx, lx));
      const cz = Math.max(-s.hz, Math.min(s.hz, lz));
      const nx = lx - cx;
      const nz = lz - cz;
      const d = Math.hypot(nx, nz);
      if (d >= RADIUS) continue;
      let px: number;
      let pz: number;
      if (d > 1e-5) {
        px = cx + (nx / d) * RADIUS;
        pz = cz + (nz / d) * RADIUS;
      } else {
        // centro dentro de la caja: salir por el lado más cercano
        const ox = s.hx - Math.abs(lx);
        const oz = s.hz - Math.abs(lz);
        if (ox < oz) {
          px = Math.sign(lx || 1) * (s.hx + RADIUS);
          pz = lz;
        } else {
          px = lx;
          pz = Math.sign(lz || 1) * (s.hz + RADIUS);
        }
      }
      p.x = s.x + px * c + pz * sn;
      p.z = s.z - px * sn + pz * c;
    }
  }
}

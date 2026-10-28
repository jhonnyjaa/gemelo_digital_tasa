import type { Config, Opening, Pt } from '../types';
import { rectWorld, toWorld } from './layout';

/** Geometría de paredes, barandas y colisiones. Se calcula una vez por config y la comparten el render y el modo caminar. */

export type PieceKind = 'solid' | 'glass' | 'trim' | 'door';
export interface Piece {
  k: PieceKind;
  x: number;
  y: number;
  z: number;
  sx: number;
  sy: number;
  sz: number;
  yaw: number;
}
export interface SideWalls {
  /** normal hacia afuera */
  n: Pt;
  mid: Pt;
  pieces: Piece[];
}
export interface RoomWalls {
  id: string;
  name: string;
  color: string;
  cx: number;
  cz: number;
  base: number;
  h: number;
  label: boolean;
  sides: SideWalls[];
}
/** Caja orientada que bloquea el paso (círculo del avatar vs caja) */
export interface Solid {
  x: number;
  z: number;
  hx: number;
  hz: number;
  yaw: number;
  y0: number;
  y1: number;
}
export interface World {
  rooms: RoomWalls[];
  outline: { a: Pt; b: Pt; n: Pt }[];
  /** baranda, stride 8 (ver Boxes) */
  rails: number[];
  posts: number[];
  deckRails: number[];
  deckPosts: number[];
  solids: Solid[];
}

const T = 0.14;
const push = (a: number[], x: number, y: number, z: number, sx: number, sy: number, sz: number, yaw = 0) => a.push(x, y, z, sx, sy, sz, yaw, 0);

function wallSide(a: Pt, b: Pt, n: Pt, ops: { t0: number; t1: number; kind: Opening['kind']; sill: number; top: number }[], base: number, h: number): Piece[] {
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  const L = Math.hypot(dx, dz);
  const ux = dx / L;
  const uz = dz / L;
  const yaw = -Math.atan2(dz, dx);
  const out: Piece[] = [];
  const box = (k: PieceKind, s0: number, s1: number, y0: number, y1: number, th = T) => {
    if (s1 - s0 < 0.01 || y1 - y0 < 0.01) return;
    const m = (s0 + s1) / 2;
    out.push({ k, x: a[0] + ux * m, y: base + (y0 + y1) / 2, z: a[1] + uz * m, sx: s1 - s0, sy: y1 - y0, sz: th, yaw });
  };
  const sorted = [...ops].sort((p, q) => p.t0 - q.t0);
  let cur = 0;
  for (const o of sorted) {
    box('solid', cur, o.t0, 0, h);
    const w = o.t1 - o.t0;
    if (o.kind === 'window') {
      box('solid', o.t0, o.t1, 0, o.sill);
      box('solid', o.t0, o.t1, o.top, h);
      box('glass', o.t0, o.t1, o.sill, o.top, 0.04);
      const e = 0.05;
      box('trim', o.t0, o.t1, o.sill - e, o.sill + e, T + 0.04);
      box('trim', o.t0, o.t1, o.top - e, o.top + e, T + 0.04);
      box('trim', o.t0, o.t0 + e * 2, o.sill, o.top, T + 0.04);
      box('trim', o.t1 - e * 2, o.t1, o.sill, o.top, T + 0.04);
      if (w > 2) box('trim', (o.t0 + o.t1) / 2 - 0.03, (o.t0 + o.t1) / 2 + 0.03, o.sill, o.top, T + 0.03);
    } else {
      const dh = 2.1;
      box('solid', o.t0, o.t1, dh, h);
      box('trim', o.t0, o.t0 + 0.07, 0, dh, T + 0.04);
      box('trim', o.t1 - 0.07, o.t1, 0, dh, T + 0.04);
      box('trim', o.t0, o.t1, dh - 0.05, dh + 0.02, T + 0.04);
      // hoja entreabierta, hacia el interior del cuarto
      const lw = Math.max(0.5, w - 0.12);
      const hx = a[0] + ux * (o.t0 + 0.04);
      const hz = a[1] + uz * (o.t0 + 0.04);
      const base0 = Math.atan2(uz, ux);
      let best: Pt = [ux, uz];
      for (const th of [1.15, -1.15]) {
        const d: Pt = [Math.cos(base0 - th), Math.sin(base0 - th)];
        if (d[0] * n[0] + d[1] * n[1] < 0) best = d;
      }
      out.push({ k: o.kind === 'glassdoor' ? 'glass' : 'door', x: hx + best[0] * (lw / 2), y: base + 1.02, z: hz + best[1] * (lw / 2), sx: lw, sy: 2.0, sz: o.kind === 'glassdoor' ? 0.04 : 0.05, yaw: -Math.atan2(best[1], best[0]) });
    }
    cur = o.t1;
  }
  box('solid', cur, L, 0, h);
  return out;
}

function sideDefs(r: { cx: number; cz: number; w: number; d: number }) {
  const x0 = r.cx - r.w / 2;
  const x1 = r.cx + r.w / 2;
  const z0 = r.cz - r.d / 2;
  const z1 = r.cz + r.d / 2;
  return {
    n: { a: [x0, z0] as Pt, b: [x1, z0] as Pt, nrm: [0, -1] as Pt },
    s: { a: [x0, z1] as Pt, b: [x1, z1] as Pt, nrm: [0, 1] as Pt },
    w: { a: [x0, z0] as Pt, b: [x0, z1] as Pt, nrm: [-1, 0] as Pt },
    e: { a: [x1, z0] as Pt, b: [x1, z1] as Pt, nrm: [1, 0] as Pt },
  };
}

function roomWalls(cfg: Config, id: string, name: string, color: string, rect: [number, number, number, number], base: number, h: number, openings: Opening[], label: boolean): RoomWalls {
  const r = rectWorld(cfg, rect);
  const defs = sideDefs(r);
  const x0 = r.cx - r.w / 2;
  const z0 = r.cz - r.d / 2;
  const sides: SideWalls[] = (['n', 's', 'w', 'e'] as const).map((sd) => {
    const def = defs[sd];
    const L = Math.hypot(def.b[0] - def.a[0], def.b[1] - def.a[1]);
    const ops = openings
      .filter((o) => o.side === sd)
      .map((o) => {
        const c = sd === 'n' || sd === 's' ? toWorld(cfg, [o.at, 0])[0] - x0 : toWorld(cfg, [0, o.at])[1] - z0;
        return { t0: Math.max(0.1, c - o.w / 2), t1: Math.min(L - 0.1, c + o.w / 2), kind: o.kind, sill: o.sill ?? 0.9, top: o.top ?? 2.2 };
      })
      .filter((o) => o.t1 - o.t0 > 0.3);
    return {
      n: def.nrm,
      mid: [(def.a[0] + def.b[0]) / 2, (def.a[1] + def.b[1]) / 2] as Pt,
      pieces: wallSide(def.a, def.b, def.nrm, ops, base, h),
    };
  });
  return { id, name, color, cx: r.cx, cz: r.cz, base, h, label, sides };
}

/** Barandas con aberturas: tramos [t0,t1] (m) sin baranda */
function railLine(w: World, a: Pt, b: Pt, base: number, gaps: [number, number][] = [], deck = false) {
  const rails = deck ? w.deckRails : w.rails;
  const posts = deck ? w.deckPosts : w.posts;
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  const L = Math.hypot(dx, dz);
  if (L < 0.1) return;
  const ux = dx / L;
  const uz = dz / L;
  const yaw = -Math.atan2(dz, dx);
  const segs: [number, number][] = [];
  let cur = 0;
  for (const [g0, g1] of [...gaps].sort((p, q) => p[0] - q[0])) {
    if (g0 > cur) segs.push([cur, g0]);
    cur = Math.max(cur, g1);
  }
  if (cur < L) segs.push([cur, L]);
  for (const [s0, s1] of segs) {
    const len = s1 - s0;
    if (len < 0.2) continue;
    const m = (s0 + s1) / 2;
    const cx = a[0] + ux * m;
    const cz = a[1] + uz * m;
    for (const y of [1.05, 0.55]) push(rails, cx, base + y, cz, len, 0.05, 0.05, yaw);
    const n = Math.max(1, Math.round(len / 2));
    for (let i = 0; i <= n; i++) push(posts, a[0] + ux * (s0 + (len * i) / n), base + 0.52, a[1] + uz * (s0 + (len * i) / n), 0.05, 1.04, 0.05);
    w.solids.push({ x: cx, z: cz, hx: len / 2, hz: 0.06, yaw, y0: base, y1: base + 1.05 });
  }
}

const cache = new WeakMap<Config, World>();

export function buildWorld(cfg: Config): World {
  const hit = cache.get(cfg);
  if (hit) return hit;
  const w: World = { rooms: [], outline: [], rails: [], posts: [], deckRails: [], deckPosts: [], solids: [] };
  const addSolid = (p: Piece) => {
    if (p.k !== 'solid' && p.k !== 'glass') return;
    if (p.k === 'glass' && p.sy >= 1.99) return; // hoja de puerta
    w.solids.push({ x: p.x, z: p.z, hx: p.sx / 2, hz: p.sz / 2, yaw: p.yaw, y0: p.y - p.sy / 2, y1: p.y + p.sy / 2 });
  };

  // cuartos de planta baja (zonas con `build`) y oficinas del segundo piso
  for (const z of cfg.zones) {
    if (!z.build) continue;
    const rw = roomWalls(cfg, z.id, z.name, z.color, z.rect, 0, z.build.h, z.build.openings, z.id === 'recepcion');
    w.rooms.push(rw);
  }
  const uf = cfg.upperFloor;
  for (const rm of uf.rooms) w.rooms.push(roomWalls(cfg, `up:${rm.name}`, rm.name, rm.color, rm.rect, uf.height, 2.8, rm.openings ?? [], true));
  for (const rw of w.rooms) for (const sd of rw.sides) for (const p of sd.pieces) addSolid(p);

  // baranda del borde de la losa de oficinas (abierta donde llega la escalera) y de la cubierta de la mezanine
  const edgeGaps = (stairs: Config['stairs'], axis: 'x' | 'z', fixedPx: number, tol: number): [number, number][] => {
    const out: [number, number][] = [];
    for (const s of stairs) {
      const e = s.to;
      if ((axis === 'z' ? Math.abs(e[1] - fixedPx) : Math.abs(e[0] - fixedPx)) > tol) continue;
      const wd = (s.width * cfg.scale) / 2 + 0.1;
      const c = toWorld(cfg, e);
      out.push(axis === 'z' ? [c[0] - wd, c[0] + wd] : [c[1] - wd, c[1] + wd]);
    }
    return out;
  };
  const slab = rectWorld(cfg, uf.rect);
  const sx0 = slab.cx - slab.w / 2;
  const sx1 = slab.cx + slab.w / 2;
  const sz0 = slab.cz - slab.d / 2;
  const sz1 = slab.cz + slab.d / 2;
  const gapsS = edgeGaps(cfg.stairs, 'z', uf.rect[3], 14).map(([a, b]) => [a - sx0, b - sx0] as [number, number]);
  const al = uf.alero ? rectWorld(cfg, uf.alero) : null;
  if (al) {
    const ax0 = al.cx - al.w / 2;
    const az1 = al.cz + al.d / 2;
    const [bx] = toWorld(cfg, [uf.rooms.find((r) => r.name === 'Sala de reuniones')?.rect[0] ?? uf.alero![2], 0]);
    gapsS.push([ax0 - sx0, sx1 - sx0]);
    railLine(w, [ax0, az1], [Math.min(bx, ax0 + al.w), az1], uf.height);
    const gw = cfg.stairs.filter((s) => Math.abs(s.to[0] - uf.alero![0]) < 14).map((s) => { const c = toWorld(cfg, s.to)[1]; const hw = (s.width * cfg.scale) / 2 + 0.1; return [c - hw - (al.cz - al.d / 2), c + hw - (al.cz - al.d / 2)] as [number, number]; });
    railLine(w, [ax0, al.cz - al.d / 2], [ax0, az1], uf.height, gw);
  }
  railLine(w, [sx0, sz1], [sx1, sz1], uf.height, gapsS);
  railLine(w, [sx0, sz0], [sx0, sz1], uf.height);
  railLine(w, [sx1, sz0], [sx1, sz1], uf.height);

  const d = rectWorld(cfg, cfg.mezzDeck.rect);
  const dx0 = d.cx - d.w / 2;
  const dx1 = d.cx + d.w / 2;
  const dz0 = d.cz - d.d / 2;
  const dz1 = d.cz + d.d / 2;
  const H = cfg.mezzDeck.height;
  const gapsW = edgeGaps(cfg.stairs, 'x', cfg.mezzDeck.rect[0], 14).map(([a, b]) => [a - dz0, b - dz0] as [number, number]);
  railLine(w, [dx0, dz0], [dx1, dz0], H, [], true);
  railLine(w, [dx0, dz1], [dx1, dz1], H, [], true);
  railLine(w, [dx1, dz0], [dx1, dz1], H, [], true);
  railLine(w, [dx0, dz0], [dx0, dz1], H, gapsW, true);

  // pared perimetral con portones de ingreso
  const pts = cfg.building.outline.map((p) => toWorld(cfg, p));
  const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
  const cz = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  const gates = (cfg.building.gates ?? []).map((g) => ({ p: toWorld(cfg, g.p), hw: g.width / 2 }));
  pts.forEach((a, i) => {
    const b = pts[(i + 1) % pts.length];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const ux = (b[0] - a[0]) / L;
    const uz = (b[1] - a[1]) / L;
    let n: Pt = [-uz, ux];
    if (n[0] * ((a[0] + b[0]) / 2 - cx) + n[1] * ((a[1] + b[1]) / 2 - cz) < 0) n = [-n[0], -n[1]];
    const cuts: [number, number][] = [];
    for (const g of gates) {
      const t = (g.p[0] - a[0]) * ux + (g.p[1] - a[1]) * uz;
      const off = Math.abs((g.p[0] - a[0]) * -uz + (g.p[1] - a[1]) * ux);
      if (off < 3 && t > -g.hw && t < L + g.hw) cuts.push([t - g.hw, t + g.hw]);
    }
    cuts.sort((p, q) => p[0] - q[0]);
    let cur = 0;
    const add = (s0: number, s1: number) => {
      if (s1 - s0 < 0.2) return;
      const A: Pt = [a[0] + ux * s0, a[1] + uz * s0];
      const B: Pt = [a[0] + ux * s1, a[1] + uz * s1];
      w.outline.push({ a: A, b: B, n });
      w.solids.push({ x: (A[0] + B[0]) / 2, z: (A[1] + B[1]) / 2, hx: (s1 - s0) / 2, hz: 0.2, yaw: -Math.atan2(uz, ux), y0: 0, y1: cfg.building.wallHeight });
    };
    for (const [c0, c1] of cuts) {
      add(cur, Math.max(cur, c0));
      cur = Math.max(cur, c1);
    }
    add(cur, L);
  });

  cache.set(cfg, w);
  return w;
}

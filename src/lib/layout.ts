import type { Config, RackCfg, Pt } from '../types';

export const BEAM_T = 0.1;

export interface RackLayout {
  id: number;
  cfg: RackCfg;
  label: string;
  levels: number;
  totalCols: number;
  levelH: number;
  baseY: number;
  depth: number;
  pitch: number;
  /** origen en mundo (x,z) */
  ox: number;
  oz: number;
  /** dirección en mundo (x,z) */
  dx: number;
  dz: number;
  yaw: number;
  /** metros a lo largo de la dirección donde empieza cada columna (índice 0-based) */
  colStart: number[];
  /** tramos continuos: columnas [from,to) y extensión en metros */
  segs: { from: number; to: number; x0: number; x1: number }[];
  length: number;
  group: string;
}

export const pad3 = (n: number) => String(n).padStart(3, '0');

export function toWorld(cfg: Config, p: Pt): Pt {
  return [(p[0] - cfg.origin[0]) * cfg.scale, (p[1] - cfg.origin[1]) * cfg.scale];
}

export function rectWorld(cfg: Config, r: [number, number, number, number]) {
  const [x0, z0] = toWorld(cfg, [r[0], r[1]]);
  const [x1, z1] = toWorld(cfg, [r[2], r[3]]);
  return { cx: (x0 + x1) / 2, cz: (z0 + z1) / 2, w: Math.abs(x1 - x0), d: Math.abs(z1 - z0) };
}

export function totalColumns(r: RackCfg): number {
  return r.bays ? r.bays * (r.subcolumns ?? 1) : (r.columns ?? 1);
}

export function buildLayouts(cfg: Config): Map<number, RackLayout> {
  const out = new Map<number, RackLayout>();
  const S = cfg.scale;
  for (const r of cfg.racks) {
    const total = totalColumns(r);
    const [ox, oz] = toWorld(cfg, r.origin);
    const len = Math.hypot(r.dir[0], r.dir[1]) || 1;
    const dx = r.dir[0] / len;
    const dz = r.dir[1] / len;
    const pitch = r.pitch * S;
    const gaps = new Map((r.gaps ?? []).map((g) => [g.after, g.width * S]));
    const colStart: number[] = [];
    const segs: RackLayout['segs'] = [];
    let off = 0;
    let segFrom = 0;
    let segX0 = 0;
    for (let c = 0; c < total; c++) {
      colStart.push(off);
      off += pitch;
      const gap = gaps.get(c + 1);
      if (gap !== undefined && c + 1 < total) {
        segs.push({ from: segFrom, to: c + 1, x0: segX0, x1: off });
        off += gap;
        segFrom = c + 1;
        segX0 = off;
      }
    }
    segs.push({ from: segFrom, to: total, x0: segX0, x1: off });
    out.set(r.id, {
      id: r.id,
      cfg: r,
      label: pad3(r.id),
      levels: r.levels,
      totalCols: total,
      levelH: r.levelHeight ?? cfg.levelHeight,
      baseY: r.baseY ?? 0,
      depth: r.depth * S,
      pitch,
      ox,
      oz,
      dx,
      dz,
      yaw: -Math.atan2(dz, dx),
      colStart,
      segs,
      length: off,
      group: r.group ?? 'main',
    });
  }
  return out;
}

/** Centro del hueco (nivel 0-based, columna 1-based) y sus dimensiones */
export function slotCenter(rl: RackLayout, level: number, col: number) {
  const x = rl.colStart[col - 1] + rl.pitch / 2;
  return {
    x: rl.ox + rl.dx * x,
    y: rl.baseY + level * rl.levelH + rl.levelH / 2,
    z: rl.oz + rl.dz * x,
    w: rl.pitch,
    h: rl.levelH,
    d: rl.depth,
  };
}

/** Parte la ubicación "001-A-003" (acepta 1-a-3, 001–A–003, etc.) */
const LOC_RE = /^\s*0*(\d{1,3})\s*[-–—]\s*([A-Za-z])\s*[-–—]\s*0*(\d{1,3})\s*$/;

export interface ParsedLoc {
  rack: number;
  letter: string;
  num: number;
}

export function parseRackLoc(raw: string): ParsedLoc | null {
  const m = LOC_RE.exec(raw);
  if (!m) return null;
  return { rack: +m[1], letter: m[2].toUpperCase(), num: +m[3] };
}

export const fmtLoc = (p: ParsedLoc) => `${pad3(p.rack)}-${p.letter}-${pad3(p.num)}`;

/** Resuelve una ubicación parseada contra la geometría. Devuelve el hueco o el motivo del error. */
export function resolveSlot(
  layouts: Map<number, RackLayout>,
  p: ParsedLoc,
): { level: number; col: number } | { error: string } {
  const rl = layouts.get(p.rack);
  if (!rl) return { error: `El rack ${pad3(p.rack)} no existe` };
  const idx = p.letter.charCodeAt(0) - 65;
  const sub = rl.cfg.subcolumns;
  if (rl.cfg.bays && sub) {
    const bay = Math.floor(idx / rl.levels);
    if (bay >= rl.cfg.bays) return { error: `Nivel ${p.letter} fuera de rango en rack ${rl.label} (${rl.cfg.bays} columnas)` };
    if (p.num < 1 || p.num > sub) return { error: `Subcolumna ${pad3(p.num)} fuera de rango en rack ${rl.label} (1-${sub})` };
    return { level: idx % rl.levels, col: bay * sub + p.num };
  }
  if (idx >= rl.levels) return { error: `Nivel ${p.letter} fuera de rango en rack ${rl.label} (${rl.levels} niveles)` };
  if (p.num < 1 || p.num > rl.totalCols) return { error: `Columna ${pad3(p.num)} fuera de rango en rack ${rl.label} (1-${rl.totalCols})` };
  return { level: idx, col: p.num };
}

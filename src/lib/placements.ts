import type { Box, Config, ZoneCfg } from '../types';
import { BEAM_T, rectWorld, slotCenter, type RackLayout } from './layout';

export interface Placements {
  /** x,y,z del centro de cada caja */
  pos: Float32Array;
  /** ancho, alto, fondo */
  size: Float32Array;
  yaw: Float32Array;
  /** 1 si está en el piso superior de la mezanine */
  upper: Uint8Array;
}

/** Calcula dónde se dibuja cada caja: una por (código, ubicación), repartidas dentro de su hueco o zona. */
export function computePlacements(boxes: Box[], layouts: Map<number, RackLayout>, cfg: Config, dynZones: ZoneCfg[] = []): Placements {
  const n = boxes.length;
  const pos = new Float32Array(n * 3);
  const size = new Float32Array(n * 3);
  const yaw = new Float32Array(n);
  const upper = new Uint8Array(n);

  const slots = new Map<string, number[]>();
  const zones = new Map<string, number[]>();
  for (const b of boxes) {
    const p = b.placement;
    if (p.kind === 'slot') {
      const k = `${p.rack}|${p.level}|${p.col}`;
      (slots.get(k) ?? slots.set(k, []).get(k)!).push(b.id);
    } else {
      (zones.get(p.zone) ?? zones.set(p.zone, []).get(p.zone)!).push(b.id);
    }
  }

  for (const [key, ids] of slots) {
    const [r, l, c] = key.split('|').map(Number);
    const rl = layouts.get(r)!;
    const sc = slotCenter(rl, l, c);
    const cnt = ids.length;
    const nx = Math.min(cnt, Math.max(1, Math.round(Math.sqrt((cnt * sc.w) / sc.h))));
    const ny = Math.ceil(cnt / nx);
    const cw = sc.w / nx;
    const ch = (sc.h - BEAM_T - 0.03) / ny;
    const s = Math.min(cw * 0.85, ch * 0.85, sc.d * 0.85, 0.7);
    const x0 = rl.colStart[c - 1];
    ids.forEach((id, i) => {
      const ix = i % nx;
      const iy = Math.floor(i / nx);
      const lx = x0 + (ix + 0.5) * cw;
      pos[id * 3] = rl.ox + rl.dx * lx;
      pos[id * 3 + 1] = rl.baseY + l * rl.levelH + BEAM_T + iy * ch + s * 0.4;
      pos[id * 3 + 2] = rl.oz + rl.dz * lx;
      size.set([s, s * 0.8, s], id * 3);
      yaw[id] = rl.yaw;
      upper[id] = rl.group === 'mezzUp' ? 1 : 0;
    });
  }

  for (const [zid, ids] of zones) {
    const z = cfg.zones.find((x) => x.id === zid) ?? dynZones.find((x) => x.id === zid) ?? cfg.zones.find((x) => x.kind === 'virtual');
    if (!z) continue;
    const { cx, cz, w, d } = rectWorld(cfg, z.rect);
    const pitch = Math.max(0.2, Math.min(0.8, Math.sqrt((w * d * 4) / ids.length)));
    const s = pitch * 0.8;
    const cols = Math.max(1, Math.floor(w / pitch));
    const rows = Math.max(1, Math.floor(d / pitch));
    const cap = cols * rows;
    ids.forEach((id, i) => {
      const layer = Math.floor(i / cap);
      const k = i % cap;
      pos[id * 3] = cx - w / 2 + pitch / 2 + (k % cols) * pitch;
      pos[id * 3 + 1] = layer * s * 0.85 + s * 0.4 + 0.03;
      pos[id * 3 + 2] = cz - d / 2 + pitch / 2 + Math.floor(k / cols) * pitch;
      size.set([s, s * 0.8, s], id * 3);
    });
  }
  return { pos, size, yaw, upper };
}

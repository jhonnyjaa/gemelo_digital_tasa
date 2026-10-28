import type { Config, ZoneCfg } from '../types';

const PALETTE = ['#06b6d4', '#f97316', '#84cc16', '#e879f9', '#facc15', '#14b8a6', '#fb7185', '#60a5fa'];
const hash = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);

/**
 * Zonas dinámicas: una por cada ubicación SAP no mapeada (p. ej. "PATIO EXT" cuando el patio cambia de lugar).
 * Se acomodan por filas dentro de `cfg.dynamicArea`, y su tamaño crece con la cantidad de artículos.
 */
export function layoutDynamic(cfg: Config, entries: { id: string; name: string; count: number }[]): ZoneCfg[] {
  const [ax0, ay0, ax1, ay1] = cfg.dynamicArea;
  const S = cfg.scale;
  const gap = 1.4 / S; // px
  const sorted = [...entries].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  const out: ZoneCfg[] = [];
  let x = ax0;
  let y = ay1; // se llena desde el borde sur (junto al edificio) hacia el norte
  let rowH = 0;
  for (const e of sorted) {
    const area = Math.max(14, e.count * 0.3); // m²
    const dM = Math.min(7, Math.max(3.2, Math.sqrt(area / 1.8)));
    const wM = Math.min(26, Math.max(4.5, area / dM));
    const w = wM / S;
    const d = dM / S;
    if (x + w > ax1 && x > ax0) {
      x = ax0;
      y -= rowH + gap;
      rowH = 0;
    }
    out.push({ id: e.id, name: e.name, kind: 'yard', rect: [x, y - d, x + w, y], color: PALETTE[hash(e.id) % PALETTE.length], dynamic: true });
    x += w + gap;
    rowH = Math.max(rowH, d);
  }
  return out;
}

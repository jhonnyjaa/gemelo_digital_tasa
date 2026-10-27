import type { Config, ItemType, Row } from '../types';
import { totalColumns, pad3 } from './layout';

let seed = 12345;
const rnd = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};
const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)];

const WORDS = ['RODAMIENTO', 'FILTRO', 'VALVULA', 'SELLO', 'O-RING', 'CORREA', 'MOTOR', 'BOMBA', 'SENSOR', 'ADITIVO', 'TORNILLO', 'EMPAQUETADURA', 'CADENA', 'CLAMP', 'ACOPLE'];
const SPEC = ['SKF 6205', 'DN50', 'INOX 316', 'NBR 90', '1/2"', '24V', 'A-120', 'HD 2.5', 'PE15', 'ISO 9001'];
const UMS = ['UN', 'UN', 'UN', 'KG', 'M', 'L', 'M3'];

function randomLoc(cfg: Config): string {
  const r = pick(cfg.racks);
  const letters = r.bays ? r.bays * r.levels : r.levels;
  const L = String.fromCharCode(65 + Math.floor(rnd() * letters));
  const c = r.bays ? 1 + Math.floor(rnd() * (r.subcolumns ?? 1)) : 1 + Math.floor(rnd() * totalColumns(r));
  return `${rnd() < 0.5 ? r.id : pad3(r.id)}-${L}-${rnd() < 0.5 ? c : pad3(c)}`;
}

/** Genera datos sintéticos con el mismo formato que SAP (≈ mitad sin ubicación, algunos inválidos y en zonas). */
export function generateDemo(cfg: Config, total = 6000): Record<ItemType, Row[]> {
  const out: Record<ItemType, Row[]> = { BSU: [], MAT: [], ACT: [] };
  const zoneNames = ['PATIO GAS', 'PATIO EXT', 'CROSS DOCKING', 'TRANSITO TEMPORAL', 'ALMACENAMIENTO TEMPORAL'];
  const loc = (): string => {
    const x = rnd();
    if (x < 0.5) return '';
    if (x < 0.53) return pick(zoneNames);
    if (x < 0.55) return pick(['11', 'XYZ', '099-A-001', '001-Z-001', '001-A-999']);
    return randomLoc(cfg);
  };
  for (let i = 0; i < total; i++) {
    const x = rnd();
    const type: ItemType = x < 0.25 ? 'BSU' : x < 0.9 ? 'MAT' : 'ACT';
    const desc = `${pick(WORDS)} ${pick(SPEC)}`;
    const um = pick(UMS);
    if (type === 'ACT') {
      out.ACT.push({
        type, code: `423454${String(100000 + i).slice(-6)}`, desc, qty: 1, um: 'UN', lote: '', loc: loc(),
        extra: { 'Cod.Antiguo': `QR-${20000 + i}`, 'Estado Equip.': 'OPERATIVO' },
      });
    } else {
      const code = type === 'BSU' ? `BSU-${String(i).padStart(6, '0')}` : `232343${String(i).padStart(4, '0')}`;
      const lotes = rnd() < 0.2 ? 2 : 1;
      const l = loc();
      for (let k = 0; k < lotes; k++) {
        out[type].push({
          type, code, desc, qty: Math.round(rnd() * 500) / (um === 'KG' ? 10 : 1) + 1, um, lote: `LT${String(i * 3 + k).padStart(7, '0')}`, loc: l,
          extra: type === 'BSU' ? { 'Estado del bien': 'Op. Nuevo', Almacén: 'L001' } : { Almacén: pick(['L001', 'HUB']) },
        });
      }
    }
  }
  return out;
}

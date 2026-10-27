import * as XLSX from 'xlsx';
import type { Config, ItemType, Row } from '../types';
import { norm } from './locate';

/** SAP: coma = miles, punto = decimal, negativo con signo al final ("129,358.27-") */
export function parseSapNumber(v: unknown): number {
  if (typeof v === 'number') return v;
  let s = String(v ?? '').trim();
  if (!s) return 0;
  let neg = false;
  if (s.endsWith('-')) {
    neg = true;
    s = s.slice(0, -1);
  }
  if (s.startsWith('-')) {
    neg = true;
    s = s.slice(1);
  }
  const n = parseFloat(s.replace(/,/g, '').replace(/\s/g, ''));
  if (Number.isNaN(n)) return 0;
  return neg ? -n : n;
}

type Grid = string[][];

function detect(headers: string[]): ItemType | null {
  const h = new Set(headers);
  if (h.has('descripcion del bien')) return 'BSU';
  if (h.has('texto breve de material')) return 'MAT';
  if (h.has('act.fijo')) return 'ACT';
  return null;
}

/** Lee un Excel de SAP (ZMMR0080, MB52 o ZFIR0241), detectando el tipo por sus encabezados. */
export async function parseFile(file: File, cfg: Config): Promise<{ type: ItemType; rows: Row[] }> {
  const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const grid = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, raw: false, defval: '' }) as Grid;

  let hdrIdx = -1;
  let type: ItemType | null = null;
  for (let i = 0; i < Math.min(grid.length, 15); i++) {
    type = detect(grid[i].map((c) => norm(String(c))));
    if (type) {
      hdrIdx = i;
      break;
    }
  }
  if (!type) throw new Error(`${file.name}: no se reconoció el formato (ZMMR0080, MB52 o ZFIR0241)`);

  const headers = grid[hdrIdx].map((c) => norm(String(c)));
  const col = (name: string, nth = 0): number => {
    const n = norm(name);
    let seen = 0;
    for (let i = 0; i < headers.length; i++) {
      if (headers[i] === n && seen++ === nth) return i;
    }
    return -1;
  };
  const get = (r: string[], i: number) => (i < 0 ? '' : String(r[i] ?? '').trim());
  const extraOf = (r: string[], names: string[]) => {
    const o: Record<string, string> = {};
    for (const n of names) {
      const v = get(r, col(n));
      if (v && v !== '-') o[n] = v;
    }
    return o;
  };

  const rows: Row[] = [];
  const imp = cfg.importers?.[type];
  const data = grid.slice(hdrIdx + 1);

  if (type === 'BSU') {
    const c = { code: col('Material'), lote: col('Lote'), desc: col('Descripción del bien'), qty: col('Libre utilización'), um: col('Unidad de medida'), loc: col(imp?.loc ?? 'Ubicación') };
    for (const r of data) {
      const code = get(r, c.code);
      if (!code) continue;
      rows.push({
        type, code, desc: get(r, c.desc), qty: parseSapNumber(get(r, c.qty)), um: get(r, c.um), lote: get(r, c.lote), loc: get(r, c.loc),
        extra: extraOf(r, ['Almacén', 'Centro', 'Estado del bien', 'Marca', 'Modelo', 'Nro. de serie', 'Unidad de negocio', 'Area de la unidad', 'N° pieza fabric.']),
      });
    }
  } else if (type === 'MAT') {
    const c = { code: col('Material'), lote: col('Lote'), desc: col('Texto breve de material'), qty: col('Libre utilización'), um: col('Unidad medida base'), loc: col(imp?.loc ?? 'Ubicación') };
    for (const r of data) {
      const code = get(r, c.code);
      if (!code) continue;
      rows.push({
        type, code, desc: get(r, c.desc), qty: parseSapNumber(get(r, c.qty)), um: get(r, c.um), lote: get(r, c.lote), loc: get(r, c.loc),
        extra: extraOf(r, ['Almacén', 'Centro', 'Inspecc.de calidad', 'Bloqueado', 'Cad./FPC', 'Fec. Fabric.']),
      });
    }
  } else {
    const c = { code: col(imp?.code ?? 'Act.Fijo'), desc: col('Denominación'), loc: col(imp?.loc ?? 'Ubi.Física') };
    for (const r of data) {
      const code = get(r, c.code);
      if (!code) continue;
      rows.push({
        type, code, desc: get(r, c.desc), qty: 1, um: 'UN', lote: '', loc: get(r, c.loc),
        extra: extraOf(r, ['Centro', 'Cod.Antiguo', 'Subnúmero', 'Fabricante del activo fijo', 'Serie', 'Estado Equip.', 'Nro.Inven.']),
      });
    }
  }
  return { type, rows };
}

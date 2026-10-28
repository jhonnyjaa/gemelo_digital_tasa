import type { Box, Config, Issue, ItemType, Placement, Row, Stats, ZoneCfg } from '../types';
import { ITEM_TYPES } from '../types';
import { fmtLoc, parseRackLoc, resolveSlot, type RackLayout } from './layout';
import { layoutDynamic } from './dynzones';

export const norm = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

const zero = (): Record<ItemType, number> => ({ BSU: 0, MAT: 0, ACT: 0 });

export function buildBoxes(
  rowsBySource: Record<ItemType, Row[]>,
  cfg: Config,
  layouts: Map<number, RackLayout>,
): { boxes: Box[]; issues: Issue[]; stats: Stats; dynZones: ZoneCfg[] } {
  const dyn = new Map<string, { id: string; name: string; count: number }>();
  const zoneByText = new Map<string, string>();
  for (const z of cfg.zones) {
    if (z.kind === 'virtual') continue;
    zoneByText.set(norm(z.id), z.id);
    zoneByText.set(norm(z.name), z.id);
  }
  for (const [k, v] of Object.entries(cfg.aliases)) zoneByText.set(norm(k), v);

  const stats: Stats = { rows: zero(), empty: zero(), boxes: 0, placed: 0, inZones: 0, invalid: 0 };
  const issues = new Map<string, Issue>();
  const byKey = new Map<string, Box>();
  const boxes: Box[] = [];

  const addIssue = (row: Row, reason: string) => {
    const k = `${row.loc}|${reason}`;
    const it = issues.get(k);
    if (it) it.count++;
    else issues.set(k, { loc: row.loc, reason, count: 1, sample: `${row.code} ${row.desc}`, type: row.type });
  };

  for (const type of ITEM_TYPES) {
    for (const row of rowsBySource[type]) {
      stats.rows[type]++;
      const raw = row.loc.trim();
      if (!raw) {
        stats.empty[type]++;
        continue;
      }
      let placement: Placement;
      let canon: string;
      let issue: string | undefined;
      const parsed = parseRackLoc(raw);
      if (parsed) {
        canon = fmtLoc(parsed);
        const res = resolveSlot(layouts, parsed);
        if ('error' in res) {
          issue = res.error;
          placement = { kind: 'zone', zone: 'virtual' };
        } else {
          placement = { kind: 'slot', rack: parsed.rack, level: res.level, col: res.col };
        }
      } else {
        canon = raw.toUpperCase();
        const zone = zoneByText.get(norm(raw));
        if (zone) placement = { kind: 'zone', zone };
        else {
          // ubicación no mapeada: se crea una zona dinámica con ese nombre
          const id = `dyn:${norm(raw)}`;
          const d = dyn.get(id) ?? dyn.set(id, { id, name: canon, count: 0 }).get(id)!;
          placement = { kind: 'zone', zone: id };
          d.count++;
        }
      }
      if (issue) addIssue(row, issue);

      const key = `${type}|${row.code}|${canon}`;
      let box = byKey.get(key);
      if (!box) {
        box = {
          id: boxes.length,
          type,
          code: row.code,
          desc: row.desc,
          qty: 0,
          um: row.um,
          lotes: [],
          loc: canon,
          placement,
          issue,
          extra: row.extra,
          rows: 0,
          hay: '',
        };
        byKey.set(key, box);
        boxes.push(box);
      }
      box.rows++;
      if (type === 'ACT') box.qty = 1; // un activo = 1 unidad aunque tenga subnúmeros
      else box.qty += row.qty;
      if (row.lote) {
        const l = box.lotes.find((x) => x.lote === row.lote);
        if (l) l.qty += row.qty;
        else box.lotes.push({ lote: row.lote, qty: row.qty });
      }
    }
  }

  for (const b of boxes) {
    b.hay = norm(`${b.code} ${b.desc} ${b.lotes.map((l) => l.lote).join(' ')} ${b.loc} ${b.extra['Serie'] ?? ''} ${b.extra['Cod.Antiguo'] ?? ''}`);
    if (b.placement.kind === 'slot') stats.placed++;
    else if (b.issue) stats.invalid++;
    else stats.inZones++;
  }
  stats.boxes = boxes.length;
  const dynZones = layoutDynamic(cfg, [...dyn.values()]);
  return { boxes, issues: [...issues.values()].sort((a, b) => b.count - a.count), stats, dynZones };
}

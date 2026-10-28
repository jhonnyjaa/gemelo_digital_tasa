import { create } from 'zustand';
import { get as idbGet, set as idbSet } from 'idb-keyval';
import defaultConfig from './config/warehouse.config.json';
import type { Box, Config, Issue, ItemType, Quality, QualityMode, Row, Stats, Theme, ZoneCfg } from './types';
import { ITEM_TYPES } from './types';
import { buildLayouts, rectWorld, totalColumns, type RackLayout } from './lib/layout';
import { buildBoxes, norm } from './lib/locate';
import { computePlacements, type Placements } from './lib/placements';
import { generateDemo } from './lib/demo';

const CFG_KEY = 'gemelo.config.v3';
const ROWS_KEY = 'gemelo.rows.v1';
export const DEFAULT_CONFIG = defaultConfig as unknown as Config;

type V3 = [number, number, number];

const ls = (k: string, v?: string): string | null => {
  try {
    if (v !== undefined) localStorage.setItem(k, v);
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const urlQ = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('q') : null;
const savedQ = ls('gemelo.quality');
const initialMode: QualityMode = urlQ === 'low' ? 'low' : savedQ === 'high' || savedQ === 'medium' || savedQ === 'low' ? savedQ : 'auto';
const initialTheme: Theme = ls('gemelo.theme') === 'dark' ? 'dark' : 'light';
export interface Toggles {
  labels: boolean;
  upperMezz: boolean;
  zones: boolean;
  people: boolean;
  forklifts: boolean;
  racks: boolean;
  roof: boolean;
  walls: boolean;
  offices: boolean;
}
export type Drawer = 'data' | 'racks' | 'zones' | 'layers' | null;

interface Derived {
  layouts: Map<number, RackLayout>;
  boxes: Box[];
  issues: Issue[];
  stats: Stats;
  placements: Placements;
  /** zonas creadas automáticamente por ubicaciones SAP no mapeadas */
  dynZones: ZoneCfg[];
}

const emptyRows = (): Record<ItemType, Row[]> => ({ BSU: [], MAT: [], ACT: [] });

function derive(config: Config, rows: Record<ItemType, Row[]>): Derived {
  const layouts = buildLayouts(config);
  const { boxes, issues, stats, dynZones } = buildBoxes(rows, config, layouts);
  return { layouts, boxes, issues, stats, dynZones, placements: computePlacements(boxes, layouts, config, dynZones) };
}

function search(boxes: Box[], query: string, types: Record<ItemType, boolean>) {
  const tokens = norm(query).split(' ').filter(Boolean);
  if (!tokens.length) return { mask: null as Uint8Array | null, results: [] as number[], total: 0 };
  const mask = new Uint8Array(boxes.length);
  const results: number[] = [];
  let total = 0;
  for (const b of boxes) {
    if (!types[b.type]) continue;
    if (tokens.every((t) => b.hay.includes(t))) {
      mask[b.id] = 1;
      total++;
      if (results.length < 300) results.push(b.id);
    }
  }
  return { mask, results, total };
}

interface State extends Derived {
  config: Config;
  rows: Record<ItemType, Row[]>;
  ready: boolean;
  selected: number | null;
  query: string;
  mask: Uint8Array | null;
  results: number[];
  total: number;
  typeFilter: Record<ItemType, boolean>;
  toggles: Toggles;
  fly: { target: V3; cam: V3; key: number } | null;
  focusRack: number | null;
  drawer: Drawer;
  palette: boolean;
  walk: boolean;
  setWalk: (v: boolean) => void;
  quality: Quality;
  qualityMode: QualityMode;
  theme: Theme;
  setTheme: (t: Theme) => void;
  setQualityMode: (m: QualityMode) => void;
  stepQuality: (dir: 1 | -1) => void;
  setDrawer: (d: Drawer) => void;
  setPalette: (v: boolean) => void;
  init: () => Promise<void>;
  setConfig: (c: Config) => void;
  resetConfig: () => void;
  setRows: (t: ItemType, rows: Row[]) => void;
  clearRows: () => void;
  loadDemo: (n: number) => void;
  select: (id: number | null, fly?: boolean) => void;
  setQuery: (q: string) => void;
  toggleType: (t: ItemType) => void;
  toggle: (k: keyof Toggles) => void;
  flyTo: (target: V3, cam: V3) => void;
  flyToRack: (id: number) => void;
}

let flyKey = 0;

export const useStore = create<State>((set, get) => {
  const initial = derive(DEFAULT_CONFIG, emptyRows());
  const persistRows = () => idbSet(ROWS_KEY, get().rows).catch(() => {});
  const recompute = (config: Config, rows: Record<ItemType, Row[]>, extra: Partial<State> = {}) => {
    const d = derive(config, rows);
    const s = get();
    const q = search(d.boxes, s.query, s.typeFilter);
    set({ config, rows, ...d, mask: q.mask, results: q.results, total: q.total, selected: null, ...extra });
  };

  return {
    ...initial,
    config: DEFAULT_CONFIG,
    rows: emptyRows(),
    ready: false,
    selected: null,
    query: '',
    mask: null,
    results: [],
    total: 0,
    typeFilter: { BSU: true, MAT: true, ACT: true },
    toggles: { labels: true, upperMezz: true, zones: true, people: true, forklifts: true, racks: true, roof: false, walls: true, offices: true },
    fly: null,
    focusRack: null,
    drawer: null,
    palette: false,
    walk: false,
    setWalk: (walk) => set({ walk, ...(walk ? { selected: null, drawer: null, palette: false } : {}) }),
    setDrawer: (drawer) => set({ drawer: get().drawer === drawer ? null : drawer }),
    setPalette: (palette) => set({ palette }),
    qualityMode: initialMode,
    quality: initialMode === 'auto' ? 'medium' : initialMode,
    theme: initialTheme,
    setTheme: (theme) => {
      ls('gemelo.theme', theme);
      document.documentElement.dataset.theme = theme;
      set({ theme });
    },
    setQualityMode: (qualityMode) => {
      ls('gemelo.quality', qualityMode);
      set({ qualityMode, quality: qualityMode === 'auto' ? get().quality : qualityMode });
    },
    stepQuality: (dir) => {
      const s = get();
      if (s.qualityMode !== 'auto') return;
      const order: Quality[] = ['low', 'medium', 'high'];
      const i = Math.max(0, Math.min(2, order.indexOf(s.quality) + dir));
      if (order[i] !== s.quality) set({ quality: order[i] });
    },

    init: async () => {
      let config = DEFAULT_CONFIG;
      try {
        const raw = localStorage.getItem(CFG_KEY);
        if (raw) config = { ...DEFAULT_CONFIG, ...(JSON.parse(raw) as Partial<Config>) };
      } catch {
        /* config guardada inválida: usar la de fábrica */
      }
      let rows = emptyRows();
      try {
        const saved = (await idbGet(ROWS_KEY)) as Record<ItemType, Row[]> | undefined;
        if (saved) rows = { ...rows, ...saved };
      } catch {
        /* sin IndexedDB */
      }
      recompute(config, rows, { ready: true });
    },

    setConfig: (config) => {
      try {
        localStorage.setItem(CFG_KEY, JSON.stringify(config));
      } catch {
        /* ignore */
      }
      recompute(config, get().rows);
    },
    resetConfig: () => {
      try {
        localStorage.removeItem(CFG_KEY);
      } catch {
        /* ignore */
      }
      recompute(DEFAULT_CONFIG, get().rows);
    },
    setRows: (t, rows) => {
      recompute(get().config, { ...get().rows, [t]: rows });
      persistRows();
    },
    clearRows: () => {
      recompute(get().config, emptyRows());
      persistRows();
    },
    loadDemo: (n) => {
      recompute(get().config, generateDemo(get().config, n));
      persistRows();
    },

    select: (id, fly = false) => {
      set({ selected: id });
      if (id === null || !fly) return;
      const p = get().placements.pos;
      const t: V3 = [p[id * 3], p[id * 3 + 1], p[id * 3 + 2]];
      get().flyTo(t, [t[0] + 3.5, t[1] + 3.5, t[2] + 6]);
    },
    setQuery: (q) => {
      const s = get();
      const r = search(s.boxes, q, s.typeFilter);
      set({ query: q, mask: r.mask, results: r.results, total: r.total });
    },
    toggleType: (t) => {
      const s = get();
      const typeFilter = { ...s.typeFilter, [t]: !s.typeFilter[t] };
      const r = search(s.boxes, s.query, typeFilter);
      set({ typeFilter, mask: r.mask, results: r.results, total: r.total });
    },
    toggle: (k) => set({ toggles: { ...get().toggles, [k]: !get().toggles[k] } }),
    flyTo: (target, cam) => set({ fly: { target, cam, key: ++flyKey } }),
    flyToRack: (id) => {
      const rl = get().layouts.get(id);
      if (!rl) return;
      const mid = rl.length / 2;
      const t: V3 = [rl.ox + rl.dx * mid, rl.baseY + (rl.levels * rl.levelH) / 2, rl.oz + rl.dz * mid];
      const dist = Math.max(8, rl.length * 0.6);
      // cámara hacia el lado perpendicular al rack
      get().flyTo(t, [t[0] - rl.dz * dist, t[1] + dist * 0.5, t[2] + rl.dx * dist]);
      set({ focusRack: id });
    },
  };
});

export { rectWorld, totalColumns, ITEM_TYPES };

if (import.meta.env.DEV) (window as unknown as { __gemelo: typeof useStore }).__gemelo = useStore;

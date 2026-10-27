export type ItemType = 'BSU' | 'MAT' | 'ACT';
export const ITEM_TYPES: ItemType[] = ['BSU', 'MAT', 'ACT'];
export const TYPE_LABEL: Record<ItemType, string> = {
  BSU: 'Bienes segundo uso',
  MAT: 'Materiales',
  ACT: 'Activos',
};
export const TYPE_COLOR: Record<ItemType, string> = {
  BSU: '#a855f7',
  MAT: '#38bdf8',
  ACT: '#34d399',
};

export type Pt = [number, number];

export interface RackCfg {
  id: number;
  levels: number;
  /** columnas totales (racks normales) */
  columns?: number;
  /** racks con "bays": cada bay = `levels` niveles x `subcolumns`; las letras continúan entre bays */
  bays?: number;
  subcolumns?: number;
  /** centro del frente del rack en la columna 001 (px del plano) */
  origin: Pt;
  /** dirección en la que crece la numeración de columnas (plano, y hacia abajo) */
  dir: Pt;
  /** px por columna */
  pitch: number;
  /** fondo en px */
  depth: number;
  gaps?: { after: number; width: number }[];
  levelHeight?: number;
  baseY?: number;
  group?: string;
}

export interface ZoneCfg {
  id: string;
  name: string;
  kind: 'zone' | 'room' | 'yard' | 'virtual';
  rect: [number, number, number, number];
  color: string;
}

export interface RoomCfg {
  name: string;
  rect: [number, number, number, number];
  color: string;
}

export interface ForkliftCfg {
  id: string;
  speed: number;
  route: { p: Pt; action?: 'load' | 'unload'; wait?: number }[];
}

export interface PersonCfg {
  id: string;
  pos: Pt;
  floor: 0 | 1;
  pose: 'sit' | 'stand' | 'walk';
  shirt: string;
  vest?: boolean;
  path?: Pt[];
}

export interface Config {
  scale: number;
  origin: Pt;
  plan: { image: string; size: Pt; cropTop: number };
  levelHeight: number;
  mezzDeck: { rect: [number, number, number, number]; height: number };
  racks: RackCfg[];
  zones: ZoneCfg[];
  aliases: Record<string, string>;
  upperFloor: {
    height: number;
    rect: [number, number, number, number];
    rooms: RoomCfg[];
    desks: [number, number, number, number, number][];
  };
  building: { outline: Pt[]; wallHeight: number };
  walkways: { id: string; width: number; points: Pt[] }[];
  crosswalks: { p: Pt; length: number; width: number }[];
  stairs: { id: string; from: Pt; to: Pt; width: number; height: number }[];
  forklifts: ForkliftCfg[];
  people: PersonCfg[];
  importers?: Partial<Record<ItemType, { code?: string; loc?: string }>>;
}

/** Fila cruda ya normalizada desde un Excel de SAP */
export interface Row {
  type: ItemType;
  code: string;
  desc: string;
  qty: number;
  um: string;
  lote: string;
  loc: string;
  extra: Record<string, string>;
}

export type Placement =
  | { kind: 'slot'; rack: number; level: number; col: number }
  | { kind: 'zone'; zone: string };

export interface Box {
  id: number;
  type: ItemType;
  code: string;
  desc: string;
  qty: number;
  um: string;
  lotes: { lote: string; qty: number }[];
  loc: string;
  placement: Placement;
  issue?: string;
  extra: Record<string, string>;
  rows: number;
  hay: string;
}

export interface Issue {
  loc: string;
  reason: string;
  count: number;
  sample: string;
  type: ItemType;
}

export interface Stats {
  rows: Record<ItemType, number>;
  empty: Record<ItemType, number>;
  boxes: number;
  placed: number;
  inZones: number;
  invalid: number;
}

export type Quality = 'high' | 'medium' | 'low';
export type QualityMode = 'auto' | Quality;
export type Theme = 'light' | 'dark';

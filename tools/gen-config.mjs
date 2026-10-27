// Genera src/config/warehouse.config.json (punto de partida; después se edita el JSON o la UI).
// Coordenadas en "px del plano" (imagen layout_almacen.jpg mostrada a 2000x1000).
import { writeFileSync } from 'node:fs';

const racks = [];
const R = (id, levels, columns, origin, dir, pitch, depth, extra = {}) =>
  racks.push({ id, levels, columns, origin, dir, pitch, depth, ...extra });

// Racks de pasillo largo: la numeración inicia a la derecha (flecha del plano) y va hacia la izquierda.
// Los cortes (gaps) son pasajes para montacargas: la numeración continúa.
R(1, 6, 21, [1390, 646], [-1, 0], 46.7, 22, { gaps: [{ after: 8, width: 50 }, { after: 14, width: 48 }] });
R(2, 6, 21, [1390, 669], [-1, 0], 46.7, 22, { gaps: [{ after: 8, width: 50 }, { after: 14, width: 48 }] });
R(3, 6, 22, [1390, 767], [-1, 0], 46.8, 21, { gaps: [{ after: 8, width: 50 }, { after: 14, width: 50 }] });
R(4, 6, 22, [1390, 790], [-1, 0], 46.8, 21, { gaps: [{ after: 8, width: 50 }, { after: 14, width: 50 }] });
R(5, 6, 27, [1490, 884], [-1, 0], 46.8, 22, { gaps: [{ after: 11, width: 12 }, { after: 19, width: 20 }] });
// Zona inclinada (izquierda)
R(6, 4, 4, [168, 886], [-0.898, -0.442], 37, 24);
R(7, 4, 4, [298, 508], [-0.403, 0.915], 34, 22);
R(8, 4, 4, [212, 437], [0.93, 0.37], 24, 24);
R(9, 4, 6, [188, 457], [-0.4, 0.916], 29, 26);
// Almacén de insumos y oficinas
R(10, 4, 10, [1688, 888], [0, -1], 21, 22);
R(11, 4, 7, [1791, 822], [0, -1], 20.5, 22);
R(13, 4, 3, [1688, 440], [0, 1], 29, 10, { levelHeight: 0.78 });
R(14, 4, 2, [1741, 436], [0, 1], 52, 10, { levelHeight: 0.78 });
R(15, 4, 2, [1752, 436], [0, 1], 52, 10, { levelHeight: 0.78 });
R(16, 4, 2, [1777, 440], [0, 1], 52, 10, { levelHeight: 0.78 });
R(17, 3, 3, [1788, 442], [0, 1], 35, 10, { levelHeight: 1.0 });
R(18, 3, 3, [1816, 434], [0, 1], 35, 10, { levelHeight: 1.0 });

// Mezanine: piso inferior 30-47 y superior 48-65. Cada "columna" (bay) = 6 niveles x 7 subcolumnas.
// Las letras continúan entre bays: bay 1 = A-F, bay 2 = G-L, bay 3 = M-R. Subcolumna 001-007 dentro del bay.
for (let f = 0; f < 2; f++) {
  for (let i = 0; i < 9; i++) {
    for (let s = 0; s < 2; s++) {
      const id = 30 + 18 * f + 2 * i + s;
      const y = 452 + i * 43.5 + (s ? 5 : -5);
      racks.push({
        id,
        levels: 6,
        bays: id === 55 || id === 56 ? 2 : 3,
        subcolumns: 7,
        origin: [1843, y],
        dir: [1, 0],
        pitch: 5.8,
        depth: 9,
        levelHeight: 0.5,
        baseY: f ? 3.55 : 0,
        group: f ? 'mezzUp' : 'mezzLow',
      });
    }
  }
}

const zones = [
  { id: 'transito', name: 'Zona tránsito temporal', kind: 'zone', rect: [410, 452, 620, 545], color: '#f59e0b' },
  { id: 'cross1', name: 'Zona cross docking', kind: 'zone', rect: [668, 470, 965, 548], color: '#10b981' },
  { id: 'almtemp', name: 'Zona almacenamiento temporal', kind: 'zone', rect: [1015, 472, 1212, 548], color: '#6366f1' },
  { id: 'recepcion', name: 'Oficina recepción', kind: 'room', rect: [1215, 435, 1270, 545], color: '#94a3b8' },
  { id: 'activos', name: 'Oficina activos', kind: 'room', rect: [1472, 432, 1532, 535], color: '#94a3b8' },
  { id: 'sshh', name: 'SSHH', kind: 'room', rect: [1535, 430, 1680, 565], color: '#94a3b8' },
  { id: 'cross2', name: 'Zona cross docking 2', kind: 'zone', rect: [1468, 650, 1658, 765], color: '#10b981' },
  { id: 'insumos', name: 'Almacén de insumos', kind: 'zone', rect: [1668, 670, 1805, 900], color: '#ec4899' },
  { id: 'patio-gas', name: 'Patio gas', kind: 'yard', rect: [1855, 832, 1970, 890], color: '#ef4444' },
  { id: 'patio-ext', name: 'Patio exterior', kind: 'yard', rect: [1000, 925, 1650, 995], color: '#84cc16' },
  { id: 'virtual', name: 'Zona virtual (ubicación no válida)', kind: 'virtual', rect: [420, 338, 1180, 414], color: '#a855f7' },
];

const aliases = {
  'PATIO GAS': 'patio-gas',
  'PATIO EXT': 'patio-ext',
  'PATIO EXTERIOR': 'patio-ext',
  'CROSS DOCKING': 'cross1',
  'TRANSITO TEMPORAL': 'transito',
  'ALMACENAMIENTO TEMPORAL': 'almtemp',
  INSUMOS: 'insumos',
};

const upperFloor = {
  height: 3.4,
  rect: [1435, 428, 1825, 570],
  rooms: [
    { name: 'Operaciones', rect: [1435, 430, 1531, 535], color: '#38bdf8' },
    { name: 'Planificación', rect: [1534, 430, 1647, 518], color: '#34d399' },
    { name: 'Jefatura', rect: [1650, 430, 1732, 518], color: '#fbbf24' },
    { name: 'Sala de reuniones', rect: [1735, 430, 1825, 560], color: '#f472b6' },
  ],
  // [x, y, rotación°, ancho px, fondo px]
  desks: [
    [1446, 452, 90, 24, 12],
    [1446, 480, 90, 24, 12],
    [1446, 508, 90, 24, 12],
    [1510, 442, 0, 24, 12],
    [1590, 446, 0, 30, 12],
    [1690, 446, 0, 30, 12],
    [1780, 495, 90, 70, 26],
  ],
};

const people = [
  // Segundo piso (sentados)
  { id: 'p1', pos: [1458, 452], floor: 1, pose: 'sit', shirt: '#2563eb' },
  { id: 'p2', pos: [1458, 480], floor: 1, pose: 'sit', shirt: '#dc2626' },
  { id: 'p3', pos: [1458, 508], floor: 1, pose: 'sit', shirt: '#16a34a' },
  { id: 'p4', pos: [1510, 454], floor: 1, pose: 'sit', shirt: '#9333ea' },
  { id: 'p5', pos: [1590, 458], floor: 1, pose: 'sit', shirt: '#0891b2' },
  { id: 'p6', pos: [1690, 458], floor: 1, pose: 'sit', shirt: '#ea580c' },
  { id: 'p7', pos: [1764, 480], floor: 1, pose: 'sit', shirt: '#475569' },
  { id: 'p8', pos: [1796, 510], floor: 1, pose: 'sit', shirt: '#be185d' },
  { id: 'p9', pos: [1764, 510], floor: 1, pose: 'sit', shirt: '#65a30d' },
  { id: 'p10', pos: [1600, 545], floor: 1, pose: 'walk', shirt: '#2563eb', path: [[1480, 548], [1720, 548]] },
  // Planta baja
  { id: 'p11', pos: [1242, 490], floor: 0, pose: 'stand', shirt: '#0ea5e9', vest: true },
  { id: 'p12', pos: [1500, 480], floor: 0, pose: 'stand', shirt: '#0ea5e9', vest: true },
  // Peatones por los pasillos peatonales; cruzan los carriles de montacargas en los pasos de cebra (x=993)
  { id: 'p13', pos: [1250, 582], floor: 0, pose: 'walk', shirt: '#334155', vest: true, path: [[1250, 582], [993, 582], [993, 814], [520, 814]] },
  { id: 'p14', pos: [450, 582], floor: 0, pose: 'walk', shirt: '#334155', vest: true, path: [[420, 582], [900, 582]] },
  { id: 'p15', pos: [1740, 700], floor: 0, pose: 'walk', shirt: '#334155', vest: true, path: [[1740, 690], [1740, 860]] },
  { id: 'p16', pos: [1300, 814], floor: 0, pose: 'walk', shirt: '#334155', vest: true, path: [[1420, 814], [1080, 814]] },
];

// Montacargas Toyota 2.5 tn: carriles propios (nunca por los pasillos peatonales). Ceden el paso a personas.
const forklifts = [
  {
    id: 'fk1',
    speed: 2.6,
    route: [
      { p: [1440, 718] },
      { p: [690, 718], action: 'load', wait: 3 },
      { p: [666, 718] },
      { p: [666, 614] },
      { p: [1300, 614], action: 'unload', wait: 3 },
      { p: [1440, 614] },
    ],
  },
  {
    id: 'fk2',
    speed: 2.2,
    route: [
      { p: [1440, 848], action: 'unload', wait: 3 },
      { p: [360, 848], action: 'load', wait: 3 },
    ],
  },
];

const building = {
  outline: [[190, 425], [365, 440], [1975, 428], [1975, 908], [175, 912], [8, 836]],
  wallHeight: 10,
};

// Pasillos peatonales (ancho en px) y pasos de cebra donde cruzan los carriles de montacargas
const walkways = [
  { id: 'norte', width: 16, points: [[400, 582], [1300, 582]] },
  { id: 'sur', width: 16, points: [[250, 814], [1440, 814]] },
  { id: 'cruce', width: 16, points: [[993, 582], [993, 814]] },
];
const crosswalks = [
  { p: [993, 614], length: 34, width: 18 },
  { p: [993, 718], length: 34, width: 18 },
];
const stairs = [
  { id: 'mezz', from: [1822, 690], to: [1822, 570], width: 26, height: 3.4 },
  { id: 'oficinas', from: [1745, 664], to: [1745, 572], width: 22, height: 3.4 },
];

const config = {
  scale: 0.058,
  origin: [1000, 665],
  plan: { image: 'layout_almacen.jpg', size: [2000, 1000], cropTop: 330 },
  levelHeight: 1.35,
  mezzDeck: { rect: [1838, 438, 1970, 828], height: 3.4 },
  racks,
  zones,
  aliases,
  upperFloor,
  building,
  walkways,
  crosswalks,
  stairs,
  forklifts,
  people,
  importers: {
    ACT: { code: 'Act.Fijo', loc: 'Ubi.Física' },
  },
};

writeFileSync(new URL('../src/config/warehouse.config.json', import.meta.url), JSON.stringify(config, null, 1));
console.log('racks:', racks.length);

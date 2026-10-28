// Genera src/config/warehouse.config.json (punto de partida; después se edita el JSON o la UI).
// Coordenadas en "px del plano" (imagen plano_actualizado.jpg mostrada a 2000x1000).
import { writeFileSync } from 'node:fs';

const racks = [];
const R = (id, levels, columns, origin, dir, pitch, depth, extra = {}) =>
  racks.push({ id, levels, columns, origin, dir, pitch, depth, ...extra });

// Racks de pasillo largo: la numeración inicia a la derecha (flecha del plano) y va hacia la izquierda.
// Los cortes (gaps) son pasajes para montacargas: la numeración continúa.
// Columnas contadas físicamente en campo (plano_actualizado.jpg); el pitch se ajusta para cubrir el largo dibujado.
R(1, 6, 24, [1390, 646], [-1, 0], 40.8, 22, { gaps: [{ after: 9, width: 49 }, { after: 16, width: 49 }] });
R(2, 6, 24, [1390, 669], [-1, 0], 40.8, 22, { gaps: [{ after: 9, width: 49 }, { after: 16, width: 49 }] });
R(3, 6, 25, [1390, 767], [-1, 0], 42.84, 21, { gaps: [{ after: 9, width: 36 }] });
// Rack 4: 001-005 en el tramo corto (derecha, junto a la zona de almacenamiento), 006-030 en el pasillo largo.
R(4, 6, 30, [1672, 790], [-1, 0], 42.84, 21, { gaps: [{ after: 5, width: 68 }, { after: 14, width: 36 }] });
// Rack 5: 001-002 en el tramo corto (derecha), 003-029 en la fila larga.
R(5, 6, 29, [1658, 884], [-1, 0], 46.8, 22, { gaps: [{ after: 2, width: 74 }, { after: 13, width: 12 }, { after: 21, width: 20 }] });
// Zona inclinada (izquierda)
R(7, 4, 4, [168, 886], [-0.898, -0.442], 37, 24);
R(8, 4, 4, [212, 437], [0.93, 0.37], 24, 24);
// Rack 9: tramo superior interior + tramo inferior (misma línea, pasaje en medio)
R(9, 4, 8, [298, 508], [-0.403, 0.915], 34, 22, { gaps: [{ after: 4, width: 115 }] });
// Rack 10: fierros largos (perfiles, platinas...): 1 columna x 8 niveles
R(10, 8, 1, [372, 466], [-0.37, 0.93], 100, 18, { levelHeight: 0.55 });
// Rack 11: junto a la escalera de oficinas (dimensión estimada)
R(11, 4, 3, [1800, 566], [-1, 0], 18, 8, { levelHeight: 0.78 });
// Rack 12: pared izquierda, tramo superior + tramo inferior (misma línea)
R(12, 4, 10, [188, 457], [-0.4, 0.916], 29, 26, { gaps: [{ after: 6, width: 69 }] });
R(13, 4, 3, [1688, 440], [0, 1], 29, 10, { levelHeight: 0.78 });
R(14, 4, 2, [1741, 436], [0, 1], 52, 10, { levelHeight: 0.78 });
R(15, 4, 2, [1752, 436], [0, 1], 52, 10, { levelHeight: 0.78 });
R(16, 4, 2, [1777, 440], [0, 1], 52, 10, { levelHeight: 0.78 });
R(17, 3, 3, [1788, 442], [0, 1], 35, 10, { levelHeight: 1.0 });
R(18, 3, 3, [1816, 434], [0, 1], 35, 10, { levelHeight: 1.0 });
// Almacén de insumos
R(19, 4, 10, [1688, 888], [0, -1], 21, 22);
R(20, 4, 7, [1791, 822], [0, -1], 20.5, 22);
// Racks temporales de tránsito (pared norte); sin número en el plano, ids asignados
R(21, 4, 7, [965, 452], [-1, 0], 42, 16);
R(22, 4, 5, [1185, 452], [-1, 0], 33, 16);

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
  { id: 'almtemp1', name: 'Zona almacenamiento temporal (oeste)', kind: 'zone', rect: [410, 452, 620, 545], color: '#f59e0b' },
  { id: 'cross1', name: 'Zona cross docking', kind: 'zone', rect: [668, 470, 965, 548], color: '#10b981' },
  { id: 'almtemp2', name: 'Zona almacenamiento temporal (centro)', kind: 'zone', rect: [1015, 472, 1212, 548], color: '#6366f1' },
  {
    id: 'recepcion', name: 'Oficina recepción', kind: 'room', rect: [1215, 435, 1270, 545], color: '#94a3b8',
    build: { h: 3.0, openings: [
      { side: 'w', at: 468, w: 3.2, kind: 'window', sill: 0.95, top: 2.4 },
      { side: 'w', at: 522, w: 0.95, kind: 'door' },
      { side: 's', at: 1242, w: 2.2, kind: 'window', sill: 0.95, top: 2.4 },
    ] },
  },
  {
    id: 'activos', name: 'Oficina activos', kind: 'room', rect: [1472, 430, 1533, 535], color: '#94a3b8',
    build: { h: 3.1, openings: [
      { side: 'w', at: 480, w: 4.2, kind: 'window', sill: 0.95, top: 2.4 },
      { side: 's', at: 1486, w: 0.95, kind: 'door' },
      { side: 's', at: 1516, w: 1.5, kind: 'window', sill: 0.95, top: 2.4 },
    ] },
  },
  {
    id: 'sshh', name: 'SSHH', kind: 'room', rect: [1533, 430, 1680, 570], color: '#94a3b8',
    build: { h: 3.1, openings: [{ side: 's', at: 1562, w: 0.95, kind: 'door' }] },
  },
  {
    id: 'electronicos', name: 'Electrónicos', kind: 'room', rect: [1680, 430, 1825, 570], color: '#38bdf8',
    build: { h: 3.1, openings: [{ side: 's', at: 1735, w: 1.5, kind: 'door' }] },
  },
  { id: 'almtemp3', name: 'Zona almacenamiento temporal (este)', kind: 'zone', rect: [1468, 650, 1658, 765], color: '#6366f1' },
  { id: 'insumos', name: 'Almacén de insumos', kind: 'zone', rect: [1668, 670, 1805, 900], color: '#ec4899' },
  { id: 'patio-gas', name: 'Patio gas / almacenamiento temporal', kind: 'yard', rect: [1855, 832, 1970, 890], color: '#ef4444' },
  { id: 'corte', name: 'Máquina de corte', kind: 'zone', rect: [95, 760, 175, 825], color: '#f97316' },
  { id: 'virtual', name: 'Zona virtual (ubicación no válida)', kind: 'virtual', rect: [420, 338, 1180, 414], color: '#a855f7' },
];

const aliases = {
  'PATIO GAS': 'patio-gas',
  'CROSS DOCKING': 'cross1',
  'ALMACENAMIENTO TEMPORAL': 'almtemp2',
  'MAQUINA DE CORTE': 'corte',
  INSUMOS: 'insumos',
};

const upperFloor = {
  height: 3.4,
  rect: [1435, 428, 1825, 575],
  // alero: voladizo pequeño donde llega la escalera; la sala de reuniones se extiende sobre él hasta el borde
  alero: [1650, 575, 1825, 600],
  rooms: [
    {
      name: 'Operaciones', rect: [1435, 430, 1532, 575], color: '#38bdf8',
      openings: [
        { side: 'e', at: 555, w: 1.0, kind: 'door' },
        { side: 'e', at: 450, w: 2.0, kind: 'window' },
        { side: 'n', at: 1480, w: 3.0, kind: 'window' },
        { side: 'w', at: 480, w: 3.5, kind: 'window' },
        { side: 's', at: 1480, w: 3.0, kind: 'window' },
      ],
    },
    {
      name: 'Planificación', rect: [1534, 430, 1648, 524], color: '#34d399',
      openings: [
        { side: 's', at: 1556, w: 1.0, kind: 'glassdoor' },
        { side: 's', at: 1620, w: 1.8, kind: 'window' },
        { side: 'n', at: 1590, w: 3.0, kind: 'window' },
      ],
    },
    {
      name: 'Jefatura', rect: [1650, 430, 1732, 524], color: '#fbbf24',
      openings: [
        { side: 's', at: 1670, w: 1.0, kind: 'glassdoor' },
        { side: 's', at: 1708, w: 1.4, kind: 'window' },
        { side: 'n', at: 1690, w: 2.6, kind: 'window' },
      ],
    },
    {
      name: 'Sala de reuniones', rect: [1734, 430, 1825, 600], color: '#f472b6',
      openings: [
        { side: 'w', at: 588, w: 1.2, kind: 'glassdoor' },
        { side: 'w', at: 470, w: 3.0, kind: 'window' },
        { side: 's', at: 1790, w: 3.4, kind: 'window' },
        { side: 'n', at: 1780, w: 4.0, kind: 'window' },
        { side: 'e', at: 500, w: 3.0, kind: 'window' },
      ],
    },
  ],
  // [x, y, rotación°, ancho px, fondo px]
  desks: [
    [1446, 452, 90, 24, 12],
    [1446, 480, 90, 24, 12],
    [1446, 508, 90, 24, 12],
    [1510, 442, 0, 24, 12],
    [1585, 446, 0, 30, 12],
    [1660, 446, 0, 30, 12],
    [1761, 480, 90, 70, 26],
  ],
};

// mostradores y escritorios de planta baja (oficinas de recepción y activos)
const groundDesks = [
  [1226, 492, 90, 66, 12],
  [1250, 450, 0, 22, 11],
  [1481, 482, 90, 66, 12],
  [1512, 448, 0, 26, 11],
];

const people = [
  // Segundo piso (sentados)
  { id: 'p1', pos: [1458, 452], floor: 1, pose: 'sit', shirt: '#2563eb' },
  { id: 'p2', pos: [1458, 480], floor: 1, pose: 'sit', shirt: '#dc2626' },
  { id: 'p3', pos: [1458, 508], floor: 1, pose: 'sit', shirt: '#16a34a' },
  { id: 'p4', pos: [1510, 454], floor: 1, pose: 'sit', shirt: '#9333ea' },
  { id: 'p5', pos: [1590, 458], floor: 1, pose: 'sit', shirt: '#0891b2' },
  { id: 'p6', pos: [1660, 458], floor: 1, pose: 'sit', shirt: '#ea580c' },
  { id: 'p7', pos: [1740, 480], floor: 1, pose: 'sit', shirt: '#475569' },
  { id: 'p8', pos: [1790, 505], floor: 1, pose: 'sit', shirt: '#be185d' },
  { id: 'p9', pos: [1740, 505], floor: 1, pose: 'sit', shirt: '#65a30d' },
  { id: 'p10', pos: [1600, 548], floor: 1, pose: 'walk', shirt: '#2563eb', path: [[1500, 550], [1712, 550]] },
  // Planta baja
  { id: 'p11', pos: [1244, 492], floor: 0, pose: 'stand', shirt: '#0ea5e9', vest: true },
  { id: 'p12', pos: [1503, 480], floor: 0, pose: 'stand', shirt: '#0ea5e9', vest: true },
  // Peatones por los pasillos peatonales; cruzan los carriles de montacargas en los pasos de cebra (x=993)
  { id: 'p13', pos: [1250, 582], floor: 0, pose: 'walk', shirt: '#334155', vest: true, path: [[1250, 582], [993, 582], [993, 814], [520, 814]] },
  { id: 'p14', pos: [450, 582], floor: 0, pose: 'walk', shirt: '#334155', vest: true, path: [[420, 582], [900, 582]] },
  { id: 'p15', pos: [1760, 700], floor: 0, pose: 'walk', shirt: '#334155', vest: true, path: [[1760, 700], [1760, 860]] },
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
  // portón de ingreso (pared norte)
  gates: [{ p: [1350, 433], width: 6 }],
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
// Escalera de oficinas: pegada al bloque, sube hacia el este (como la del mezanine) hasta el alero y mira de frente la puerta de la sala de reuniones.
// Escalera de mezanine: arranca en la puerta de Electrónicos, sube hacia el este y desemboca frente a los racks.
const stairs = [
  { id: 'oficinas', from: [1520, 588], to: [1650, 588], width: 22, height: 3.4 },
  { id: 'mezz', from: [1737, 612], to: [1836, 612], width: 22, height: 3.4 },
];

const config = {
  scale: 0.058,
  origin: [1000, 665],
  plan: { image: 'plano_actualizado.jpg', size: [2000, 1000], cropTop: 330 },
  levelHeight: 1.35,
  mezzDeck: { rect: [1838, 438, 1970, 828], height: 3.4 },
  racks,
  zones,
  aliases,
  upperFloor,
  groundDesks,
  dynamicArea: [260, 100, 1250, 330],
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

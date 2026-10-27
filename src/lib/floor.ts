import { CanvasTexture, SRGBColorSpace } from 'three';
import type { Config, Pt, Theme } from '../types';
import { buildLayouts } from './layout';

/** El piso se pinta en un canvas a partir de la config: concreto, zonas epóxicas, pasillos peatonales, pasos de cebra, huellas de rack. */
export const FLOOR_TOP = 300; // y (px del plano) donde empieza el canvas
const K = 1.75; // px de canvas por px de plano

let seed = 7;
const rnd = () => {
  seed = (seed * 16807) % 2147483647;
  return seed / 2147483647;
};

/** Mosaico de ruido pequeño que se repite: mucho más barato que miles de rectángulos sobre el canvas completo. */
function noiseTile(): HTMLCanvasElement {
  const t = document.createElement('canvas');
  t.width = t.height = 384;
  const g = t.getContext('2d')!;
  for (let i = 0; i < 9000; i++) {
    g.fillStyle = rnd() < 0.5 ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.1)';
    const sz = 1 + rnd() * 2.5;
    g.fillRect(rnd() * 384, rnd() * 384, sz, sz);
  }
  return t;
}

export function paintFloor(cfg: Config, theme: Theme = 'dark'): CanvasTexture {
  const dark = theme === 'dark';
  const [W, H] = cfg.plan.size;
  const c = document.createElement('canvas');
  c.width = Math.round(W * K);
  c.height = Math.round((H - FLOOR_TOP) * K);
  const g = c.getContext('2d')!;
  const P = (p: Pt): Pt => [p[0] * K, (p[1] - FLOOR_TOP) * K];
  const poly = (pts: Pt[]) => {
    g.beginPath();
    pts.forEach((p, i) => {
      const [x, y] = P(p);
      if (i) g.lineTo(x, y);
      else g.moveTo(x, y);
    });
    g.closePath();
  };
  const tile = noiseTile();
  const noise = () => {
    g.fillStyle = g.createPattern(tile, 'repeat')!;
    g.fillRect(0, 0, c.width, c.height);
  };

  // exterior: asfalto
  g.fillStyle = dark ? '#2b2f35' : '#5d646d';
  g.fillRect(0, 0, c.width, c.height);
  noise();

  // interior: concreto pulido con juntas de dilatación cada 6 m
  g.save();
  poly(cfg.building.outline);
  g.clip();
  g.fillStyle = dark ? '#80868e' : '#b3b8bf';
  g.fillRect(0, 0, c.width, c.height);
  for (let i = 0; i < 40; i++) {
    const x = rnd() * c.width;
    const y = rnd() * c.height;
    const r = 80 + rnd() * 260;
    const grd = g.createRadialGradient(x, y, 0, x, y, r);
    const v = rnd() < 0.5 ? '255,255,255' : '0,0,0';
    grd.addColorStop(0, `rgba(${v},0.05)`);
    grd.addColorStop(1, `rgba(${v},0)`);
    g.fillStyle = grd;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  noise();
  g.strokeStyle = 'rgba(40,44,50,0.28)';
  g.lineWidth = 1.5;
  const joint = 6 / cfg.scale;
  for (let x = 0; x < W; x += joint) {
    const [cx] = P([x, 0]);
    g.beginPath();
    g.moveTo(cx, 0);
    g.lineTo(cx, c.height);
    g.stroke();
  }
  for (let y = FLOOR_TOP; y < H; y += joint) {
    const [, cy] = P([0, y]);
    g.beginPath();
    g.moveTo(0, cy);
    g.lineTo(c.width, cy);
    g.stroke();
  }
  g.restore();

  // zonas designadas (pintura epóxica + rótulo en el piso)
  for (const z of cfg.zones) {
    const [x0, y0] = P([z.rect[0], z.rect[1]]);
    const [x1, y1] = P([z.rect[2], z.rect[3]]);
    const w = x1 - x0;
    const h = y1 - y0;
    g.save();
    g.beginPath();
    g.rect(x0, y0, w, h);
    g.clip();
    g.fillStyle = z.color;
    g.globalAlpha = z.kind === 'room' ? 0.35 : z.kind === 'yard' ? 0.3 : 0.5;
    g.fillRect(x0, y0, w, h);
    g.globalAlpha = 0.18;
    g.strokeStyle = '#fff';
    g.lineWidth = 3;
    if (z.kind === 'virtual' || z.kind === 'yard') {
      for (let d = -h; d < w; d += 26) {
        g.beginPath();
        g.moveTo(x0 + d, y1);
        g.lineTo(x0 + d + h, y0);
        g.stroke();
      }
    }
    g.restore();
    g.globalAlpha = 1;
    g.strokeStyle = z.kind === 'virtual' ? '#c4a3ff' : '#f5c518';
    g.lineWidth = 4;
    g.setLineDash(z.kind === 'virtual' ? [18, 12] : []);
    g.strokeRect(x0, y0, w, h);
    g.setLineDash([]);
    const fs = Math.max(18, Math.min(34, w / (z.name.length * 0.62)));
    g.font = `700 ${fs}px "Inter Variable", Inter, system-ui, sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = 'rgba(255,255,255,0.82)';
    g.shadowColor = 'rgba(0,0,0,0.35)';
    g.shadowBlur = 6;
    g.fillText(z.name.toUpperCase(), x0 + w / 2, y0 + h / 2, w - 12);
    g.shadowBlur = 0;
  }

  // huellas de rack
  const layouts = buildLayouts(cfg);
  for (const rl of layouts.values()) {
    const o = rl.cfg.origin;
    const d = rl.cfg.dir;
    const dl = Math.hypot(d[0], d[1]) || 1;
    const ux = d[0] / dl;
    const uy = d[1] / dl;
    const len = rl.length / cfg.scale;
    const hd = rl.cfg.depth / 2 + 2;
    const pts: Pt[] = [
      [o[0] - uy * hd, o[1] + ux * hd],
      [o[0] + ux * len - uy * hd, o[1] + uy * len + ux * hd],
      [o[0] + ux * len + uy * hd, o[1] + uy * len - ux * hd],
      [o[0] + uy * hd, o[1] - ux * hd],
    ];
    poly(pts);
    g.fillStyle = 'rgba(15,18,24,0.35)';
    g.fill();
    if (rl.group === 'main') {
      g.strokeStyle = 'rgba(245,197,24,0.75)';
      g.lineWidth = 2.5;
      g.stroke();
    }
  }

  // guía de rutas de montacargas
  g.setLineDash([16, 14]);
  g.strokeStyle = 'rgba(250,204,21,0.28)';
  g.lineWidth = 3;
  for (const f of cfg.forklifts) {
    g.beginPath();
    f.route.forEach((r, i) => {
      const [x, y] = P(r.p);
      if (i) g.lineTo(x, y);
      else g.moveTo(x, y);
    });
    g.stroke();
  }
  g.setLineDash([]);

  // pasillos peatonales: borde amarillo + relleno verde
  for (const w of cfg.walkways) {
    g.lineCap = 'butt';
    g.lineJoin = 'miter';
    for (const [lw, col] of [[w.width + 4, '#f5c518'], [w.width, 'rgba(46,160,100,0.92)']] as const) {
      g.strokeStyle = col;
      g.lineWidth = lw * K;
      g.beginPath();
      w.points.forEach((p, i) => {
        const [x, y] = P(p);
        if (i) g.lineTo(x, y);
        else g.moveTo(x, y);
      });
      g.stroke();
    }
  }
  // pasos de cebra
  for (const cw of cfg.crosswalks) {
    const [cx, cy] = P(cw.p);
    g.fillStyle = 'rgba(255,255,255,0.92)';
    for (let x = -cw.width / 2; x < cw.width / 2; x += 6) g.fillRect(cx + x * K, cy - (cw.length / 2) * K, 3.2 * K, cw.length * K);
  }

  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 16;
  return tex;
}

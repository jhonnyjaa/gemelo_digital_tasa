import { useMemo, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { AlertTriangle, Download, FileSpreadsheet, Plus, Trash2, Upload, Sparkles, Settings2 } from 'lucide-react';
import { DEFAULT_CONFIG, useStore } from '../store';
import { ITEM_TYPES, TYPE_COLOR, TYPE_LABEL, type Config, type RackCfg } from '../types';
import { parseFile } from '../lib/importers';
import { totalColumns } from '../lib/layout';
import { Btn, Drawer, Field, Switch, fmt, inputCls } from './kit';

/* ───────── datos SAP ───────── */
export function DataDrawer() {
  const { stats, issues, setRows, clearRows, loadDemo, config, rows, setDrawer } = useStore(useShallow((s) => ({ stats: s.stats, issues: s.issues, setRows: s.setRows, clearRows: s.clearRows, loadDemo: s.loadDemo, config: s.config, rows: s.rows, setDrawer: s.setDrawer })));
  const [msgs, setMsgs] = useState<{ ok: boolean; t: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    const out: { ok: boolean; t: string }[] = [];
    for (const f of Array.from(files)) {
      await new Promise((r) => setTimeout(r, 30));
      try {
        const { type, rows: r } = await parseFile(f, config);
        setRows(type, r);
        out.push({ ok: true, t: `${f.name} · ${type} · ${fmt(r.length)} filas` });
      } catch (e) {
        out.push({ ok: false, t: (e as Error).message });
      }
    }
    setMsgs(out);
    setBusy(false);
    if (input.current) input.current.value = '';
  };

  const exportIssues = () => {
    const lines = ['tipo;ubicacion;motivo;cantidad;ejemplo', ...issues.map((i) => [i.type, i.loc, i.reason, i.count, i.sample].map((x) => `"${String(x).replace(/"/g, '""')}"`).join(';'))];
    const url = URL.createObjectURL(new Blob(['﻿' + lines.join('\n')], { type: 'text/csv' }));
    Object.assign(document.createElement('a'), { href: url, download: 'ubicaciones_con_problemas.csv' }).click();
    URL.revokeObjectURL(url);
  };

  const total = ITEM_TYPES.reduce((a, t) => a + stats.rows[t], 0);
  return (
    <Drawer title="Datos de SAP" subtitle="ZMMR0080 · MB52 · ZFIR0241" onClose={() => setDrawer(null)}>
      <label
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); onFiles(e.dataTransfer.files); }}
        className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-2xl border border-dashed px-4 py-6 text-center transition ${over ? 'border-sky-400 bg-sky-400/10' : 'border-white/15 hover:border-white/30 hover:bg-white/[0.03]'}`}
      >
        <input ref={input} type="file" accept=".xlsx,.xls,.csv" multiple hidden onChange={(e) => onFiles(e.target.files)} />
        <Upload size={22} className="text-sky-300" />
        <span className="text-sm font-medium">{busy ? 'Procesando…' : 'Suelta los Excel aquí o haz clic'}</span>
        <span className="text-xs text-slate-400">El tipo se detecta por los encabezados. Cada archivo reemplaza los datos de su transacción.</span>
      </label>
      {msgs.map((m, i) => (
        <div key={i} className={`flex items-start gap-2 rounded-lg px-3 py-2 text-xs ${m.ok ? 'bg-emerald-400/10 text-emerald-300' : 'bg-rose-400/10 text-rose-300'}`}>
          {m.ok ? <FileSpreadsheet size={14} className="mt-px shrink-0" /> : <AlertTriangle size={14} className="mt-px shrink-0" />}{m.t}
        </div>
      ))}

      <div className="grid grid-cols-3 gap-2">
        {ITEM_TYPES.map((t) => (
          <div key={t} className="rounded-xl bg-white/[0.05] p-3">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: TYPE_COLOR[t] }}><i className="h-2 w-2 rounded-sm" style={{ background: TYPE_COLOR[t] }} />{t}</div>
            <div className="mt-1 text-lg font-semibold tabular-nums">{fmt(stats.rows[t])}</div>
            <div className="text-[11px] text-slate-500">{fmt(stats.empty[t])} sin ubic.</div>
            <div className="mt-0.5 text-[10px] text-slate-600">{TYPE_LABEL[t]}</div>
          </div>
        ))}
      </div>
      <div className="text-xs text-slate-400">
        {fmt(total)} filas → {fmt(stats.boxes)} cajas · {fmt(stats.placed)} en racks · {fmt(stats.inZones)} en zonas ·{' '}
        <span className={stats.invalid ? 'text-amber-300' : ''}>{fmt(stats.invalid)} inválidas</span>
        <span className="text-slate-600"> ({ITEM_TYPES.map((t) => (rows[t].length ? t : '')).filter(Boolean).join(', ') || 'sin datos'})</span>
      </div>
      <div className="flex flex-wrap gap-2">
        <Btn onClick={() => loadDemo(6000)}><Sparkles size={14} /> Demo 6 000</Btn>
        <Btn onClick={() => loadDemo(20000)}><Sparkles size={14} /> Demo 20 000</Btn>
        <Btn variant="danger" onClick={clearRows} disabled={!total}><Trash2 size={14} /> Limpiar</Btn>
      </div>

      <div className="mt-1 flex items-center justify-between">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Ubicaciones con problemas ({issues.length})</h3>
        {issues.length > 0 && <Btn variant="ghost" onClick={exportIssues} className="!px-2 !py-1 text-xs"><Download size={13} /> CSV</Btn>}
      </div>
      <div className="flex flex-col gap-1.5">
        {issues.slice(0, 150).map((i) => (
          <div key={`${i.loc}${i.reason}`} className="rounded-lg bg-white/[0.04] px-3 py-2 text-[12px]">
            <div className="flex items-center justify-between"><b className="font-semibold">{i.loc}</b><span className="text-amber-300">×{i.count}</span></div>
            <div className="text-slate-400">{i.reason}</div>
            <div className="truncate text-slate-600">{i.sample}</div>
          </div>
        ))}
        {!issues.length && <p className="text-xs text-slate-500">Sin problemas. Las ubicaciones no válidas se dibujan en la <i>Zona virtual</i>, al norte del edificio.</p>}
      </div>
    </Drawer>
  );
}

/* ───────── editor de racks ───────── */
const rackWith = (c: Config, id: number, patch: Partial<RackCfg>): Config => ({ ...c, racks: c.racks.map((r) => (r.id === id ? { ...r, ...patch } : r)) });
const num = (v: string, min = 1) => Math.max(min, Math.floor(Number(v) || min));

export function RacksDrawer() {
  const { config, setConfig, resetConfig, flyToRack, setDrawer } = useStore(useShallow((s) => ({ config: s.config, setConfig: s.setConfig, resetConfig: s.resetConfig, flyToRack: s.flyToRack, setDrawer: s.setDrawer })));
  const [filter, setFilter] = useState('');
  const [newId, setNewId] = useState('12');
  const [open, setOpen] = useState<number | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const list = useMemo(() => config.racks.filter((r) => !filter || String(r.id).padStart(3, '0').includes(filter)).sort((a, b) => a.id - b.id), [config.racks, filter]);

  const add = () => {
    const id = num(newId);
    if (config.racks.some((r) => r.id === id)) return alert(`El rack ${id} ya existe`);
    setConfig({ ...config, racks: [...config.racks, { id, levels: 4, columns: 6, origin: [100, 380], dir: [1, 0], pitch: 46, depth: 22 }] });
    setOpen(id);
  };
  const exportCfg = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(config, null, 1)], { type: 'application/json' }));
    Object.assign(document.createElement('a'), { href: url, download: 'warehouse.config.json' }).click();
    URL.revokeObjectURL(url);
  };
  const importCfg = async (f: File | undefined) => {
    if (!f) return;
    try {
      const c = JSON.parse(await f.text()) as Partial<Config>;
      if (!Array.isArray(c.racks) || !Array.isArray(c.zones)) throw new Error('JSON sin racks/zonas');
      setConfig({ ...DEFAULT_CONFIG, ...c });
    } catch (e) {
      alert(`Configuración inválida: ${(e as Error).message}`);
    }
    if (file.current) file.current.value = '';
  };

  return (
    <Drawer title="Racks" subtitle="Niveles, columnas y posición. Los artículos se re-ubican al instante." onClose={() => setDrawer(null)}>
      <div className="flex gap-2">
        <input className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-sm outline-none focus:border-sky-400" placeholder="Filtrar rack…" value={filter} onChange={(e) => setFilter(e.target.value)} />
        <input className="w-14 rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-center text-sm outline-none focus:border-sky-400" value={newId} onChange={(e) => setNewId(e.target.value)} />
        <Btn variant="primary" onClick={add}><Plus size={14} /> Rack</Btn>
      </div>
      <div className="flex gap-2">
        <Btn onClick={exportCfg}><Download size={14} /> Exportar JSON</Btn>
        <Btn onClick={() => file.current?.click()}><Upload size={14} /> Importar</Btn>
        <Btn variant="danger" onClick={() => confirm('¿Restaurar la configuración de fábrica?') && resetConfig()}>Restaurar</Btn>
        <input ref={file} type="file" accept=".json" hidden onChange={(e) => importCfg(e.target.files?.[0])} />
      </div>
      <div className="flex flex-col gap-1.5">
        {list.map((r) => {
          const bay = !!r.bays;
          return (
            <div key={r.id} className="rounded-xl bg-white/[0.04] px-2.5 py-2">
              <div className="flex items-center gap-2">
                <button onClick={() => flyToRack(r.id)} title="Ir al rack" className="w-10 text-left text-[13px] font-bold text-amber-400 hover:underline">{String(r.id).padStart(3, '0')}</button>
                <Field label="niv"><input type="number" min={1} max={26} className={inputCls} value={r.levels} onChange={(e) => setConfig(rackWith(config, r.id, { levels: num(e.target.value) }))} /></Field>
                {bay ? (
                  <Field label="cols"><input type="number" min={1} className={inputCls} value={r.bays} onChange={(e) => setConfig(rackWith(config, r.id, { bays: num(e.target.value) }))} /></Field>
                ) : (
                  <Field label="cols"><input type="number" min={1} className={inputCls} value={r.columns ?? 1} onChange={(e) => { const c = num(e.target.value); setConfig(rackWith(config, r.id, { columns: c, gaps: (r.gaps ?? []).filter((g) => g.after < c) })); }} /></Field>
                )}
                <span className="ml-auto text-[11px] tabular-nums text-slate-500">{totalColumns(r) * r.levels} huecos</span>
                <button onClick={() => setOpen(open === r.id ? null : r.id)} className="rounded-md p-1 text-slate-400 hover:bg-white/10 hover:text-white"><Settings2 size={14} /></button>
                <button onClick={() => confirm(`¿Eliminar rack ${r.id}?`) && setConfig({ ...config, racks: config.racks.filter((x) => x.id !== r.id) })} className="rounded-md p-1 text-slate-500 hover:bg-rose-500/20 hover:text-rose-300"><Trash2 size={14} /></button>
              </div>
              {open === r.id && (
                <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 border-t border-white/5 pt-2">
                  {bay && <Field label="subcol"><input type="number" min={1} className={inputCls} value={r.subcolumns ?? 1} onChange={(e) => setConfig(rackWith(config, r.id, { subcolumns: num(e.target.value) }))} /></Field>}
                  <Field label="x (px)"><input type="number" className={inputCls} value={Math.round(r.origin[0])} onChange={(e) => setConfig(rackWith(config, r.id, { origin: [Number(e.target.value), r.origin[1]] }))} /></Field>
                  <Field label="y (px)"><input type="number" className={inputCls} value={Math.round(r.origin[1])} onChange={(e) => setConfig(rackWith(config, r.id, { origin: [r.origin[0], Number(e.target.value)] }))} /></Field>
                  <Field label="ángulo°"><input type="number" className={inputCls} value={Math.round((Math.atan2(r.dir[1], r.dir[0]) * 180) / Math.PI)} onChange={(e) => { const a = (Number(e.target.value) * Math.PI) / 180; setConfig(rackWith(config, r.id, { dir: [Math.cos(a), Math.sin(a)] })); }} /></Field>
                  <Field label="paso (px)"><input type="number" step={0.5} className={inputCls} value={r.pitch} onChange={(e) => setConfig(rackWith(config, r.id, { pitch: Math.max(1, Number(e.target.value)) }))} /></Field>
                  <Field label="fondo (px)"><input type="number" className={inputCls} value={r.depth} onChange={(e) => setConfig(rackWith(config, r.id, { depth: Math.max(1, Number(e.target.value)) }))} /></Field>
                  <Field label="alto nivel (m)"><input type="number" step={0.05} className={inputCls} value={r.levelHeight ?? config.levelHeight} onChange={(e) => setConfig(rackWith(config, r.id, { levelHeight: Math.max(0.1, Number(e.target.value)) }))} /></Field>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-xs text-slate-500">Zonas, alias, pasillos peatonales, rutas de montacargas y la escala (m/px) se editan en el JSON exportado.</p>
    </Drawer>
  );
}

/* ───────── capas ───────── */
export function LayersDrawer() {
  const { toggles, toggle, setDrawer, quality, qualityMode, setQualityMode, theme, setTheme } = useStore(
    useShallow((s) => ({ toggles: s.toggles, toggle: s.toggle, setDrawer: s.setDrawer, quality: s.quality, qualityMode: s.qualityMode, setQualityMode: s.setQualityMode, theme: s.theme, setTheme: s.setTheme })),
  );
  const items: [keyof typeof toggles, string][] = [
    ['racks', 'Racks'],
    ['labels', 'Numeración de racks'],
    ['walls', 'Paredes del edificio'],
    ['roof', 'Techo y luminarias'],
    ['upperMezz', 'Mezanine superior'],
    ['forklifts', 'Montacargas'],
    ['people', 'Personas'],
  ];
  const seg = 'flex rounded-lg bg-white/[0.07] p-0.5';
  const on = 'bg-sky-500 font-semibold text-[#fff]';
  return (
    <Drawer title="Capas y vista" onClose={() => setDrawer(null)}>
      <div className="flex flex-col">{items.map(([k, n]) => <Switch key={k} checked={toggles[k]} onChange={() => toggle(k)} label={n} />)}</div>
      <div className="flex items-center justify-between text-[13px]">Tema
        <div className={seg}>
          {(['light', 'dark'] as const).map((t) => <button key={t} onClick={() => setTheme(t)} className={`rounded-md px-3 py-1 text-xs ${theme === t ? on : 'text-slate-300'}`}>{t === 'light' ? 'Claro' : 'Oscuro'}</button>)}
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between text-[13px]">Calidad gráfica
          <div className={seg}>
            {([['auto', 'Auto'], ['high', 'Alta'], ['medium', 'Media'], ['low', 'Baja']] as const).map(([q, n]) => <button key={q} onClick={() => setQualityMode(q)} className={`rounded-md px-2.5 py-1 text-xs ${qualityMode === q ? on : 'text-slate-300'}`}>{n}</button>)}
          </div>
        </div>
        <p className="mt-1 text-[11px] text-slate-500">{qualityMode === 'auto' ? `Auto ajusta la calidad según los FPS (ahora: ${quality}).` : 'Si va lento, baja a Media o Baja.'}</p>
      </div>
      <h3 className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Leyenda</h3>
      <div className="flex flex-col gap-1.5 text-[13px]">
        {ITEM_TYPES.map((t) => <div key={t} className="flex items-center gap-2"><i className="h-3 w-3 rounded" style={{ background: TYPE_COLOR[t] }} />{t} — {TYPE_LABEL[t]}</div>)}
        <div className="flex items-center gap-2"><i className="h-3 w-3 rounded bg-pink-500" />Coincidencia de búsqueda</div>
        <div className="flex items-center gap-2"><i className="h-3 w-3 rounded bg-yellow-300" />Seleccionado</div>
        <div className="flex items-center gap-2"><i className="h-3 w-3 rounded bg-emerald-600 ring-2 ring-yellow-400" />Pasillo peatonal</div>
        <div className="flex items-center gap-2"><i className="h-3 w-3 rounded border border-dashed border-yellow-500" />Ruta de montacargas</div>
      </div>
    </Drawer>
  );
}

import { useEffect } from 'react';
import { Command } from 'cmdk';
import { AnimatePresence, motion } from 'motion/react';
import { Boxes, Copy, Crosshair, Database, Eye, Gauge, LayoutGrid, Moon, Package, Search, Sun, Warehouse, X } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import clsx from 'clsx';
import { useStore } from '../store';
import { ITEM_TYPES, TYPE_COLOR, TYPE_LABEL } from '../types';
import { VIEWS, type ViewKey } from '../scene/Scene';
import { fmt } from './kit';

/* ───────── barra superior ───────── */
export function TopBar() {
  const { query, setPalette, setQuery, stats, total, quality, qualityMode, setDrawer, theme, setTheme } = useStore(useShallow((s) => ({ query: s.query, setPalette: s.setPalette, setQuery: s.setQuery, stats: s.stats, total: s.total, quality: s.quality, qualityMode: s.qualityMode, setDrawer: s.setDrawer, theme: s.theme, setTheme: s.setTheme })));
  const qLabel = { high: 'Alta', medium: 'Media', low: 'Baja' }[quality];
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-4 p-4">
      <div className="glass pointer-events-auto flex items-center gap-3 rounded-2xl py-2 pl-2.5 pr-4">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-sky-400 to-indigo-500 text-[#0b1220]"><Warehouse size={19} /></div>
        <div className="leading-tight">
          <div className="text-[14px] font-semibold tracking-tight">Gemelo digital</div>
          <div className="text-[11px] text-slate-400">Almacén de componentes</div>
        </div>
      </div>

      <button
        onClick={() => setPalette(true)}
        className="glass pointer-events-auto flex h-12 w-full max-w-xl items-center gap-3 rounded-2xl px-4 text-left text-sm text-slate-400 transition hover:border-white/20"
      >
        <Search size={17} />
        <span className={clsx('flex-1 truncate', query && 'text-slate-100')}>{query ? `${query} · ${fmt(total)} coincidencias` : 'Buscar código, descripción, lote o ubicación…'}</span>
        {query ? (
          <span onClick={(e) => { e.stopPropagation(); setQuery(''); }} className="rounded-md p-1 hover:bg-white/10"><X size={14} /></span>
        ) : (
          <kbd className="rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-[11px]">Ctrl K</kbd>
        )}
      </button>

      <div className="glass pointer-events-auto flex items-center gap-4 rounded-2xl px-4 py-2.5 text-[12px]">
        <Stat icon={<Package size={14} />} label="Cajas" value={fmt(stats.boxes)} />
        <Stat icon={<LayoutGrid size={14} />} label="En racks" value={fmt(stats.placed)} />
        <Stat icon={<Boxes size={14} />} label="En zonas" value={fmt(stats.inZones)} />
        <button onClick={() => setDrawer('layers')} title="Calidad gráfica" className="flex items-center gap-1 rounded-md px-1.5 py-1 text-slate-400 hover:bg-white/10 hover:text-white">
          <Gauge size={14} /> {qualityMode === 'auto' ? `Auto · ${qLabel}` : qLabel}
        </button>
        <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} title="Cambiar tema" className="grid h-8 w-8 place-items-center rounded-lg text-slate-300 hover:bg-white/10">
          {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
        </button>
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-slate-500">{icon}</span>
      <div className="leading-tight"><div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div><div className="font-semibold tabular-nums">{value}</div></div>
    </div>
  );
}

/* ───────── paleta de comandos ───────── */
export function Palette() {
  const { palette, setPalette, query, setQuery, results, total, boxes, typeFilter, toggleType, select } = useStore(useShallow((s) => ({ palette: s.palette, setPalette: s.setPalette, query: s.query, setQuery: s.setQuery, results: s.results, total: s.total, boxes: s.boxes, typeFilter: s.typeFilter, toggleType: s.toggleType, select: s.select })));
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes((document.activeElement?.tagName ?? ''));
      if ((e.key === 'k' && (e.ctrlKey || e.metaKey)) || (e.key === '/' && !typing)) {
        e.preventDefault();
        setPalette(true);
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [setPalette]);

  return (
    <Command.Dialog open={palette} onOpenChange={setPalette} label="Buscar artículos" shouldFilter={false} loop className="fixed inset-0 z-50 grid place-items-start justify-center bg-black/40 pt-[12vh] backdrop-blur-[2px]">
      <div className="glass w-[min(680px,92vw)] overflow-hidden rounded-2xl">
        <div className="flex items-center gap-3 border-b border-white/10 px-4">
          <Search size={17} className="text-slate-400" />
          <Command.Input value={query} onValueChange={setQuery} placeholder="Código, descripción, lote, ubicación… (varias palabras = todas)" className="h-14 flex-1 bg-transparent text-[15px] outline-none placeholder:text-slate-500" />
          <div className="flex gap-1">
            {ITEM_TYPES.map((t) => (
              <button key={t} onClick={() => toggleType(t)} className={clsx('flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium transition', typeFilter[t] ? 'bg-white/10' : 'opacity-40')}>
                <i className="h-2 w-2 rounded-sm" style={{ background: TYPE_COLOR[t] }} />{t}
              </button>
            ))}
          </div>
        </div>
        <Command.List className="scroll max-h-[52vh] overflow-auto p-2">
          <Command.Empty className="px-4 py-10 text-center text-sm text-slate-400">{query ? 'Sin coincidencias' : `Escribe para buscar entre ${fmt(boxes.length)} artículos ubicados`}</Command.Empty>
          {query && <div className="px-3 pb-1 pt-1 text-[11px] text-slate-500">{fmt(total)} coincidencias{total > results.length ? ` · mostrando ${results.length}` : ''} · Enter para ir al artículo</div>}
          {results.map((id) => {
            const b = boxes[id];
            return (
              <Command.Item key={id} value={String(id)} onSelect={() => { select(id, true); setPalette(false); }} className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2">
                <span className="h-8 w-1.5 rounded-full" style={{ background: TYPE_COLOR[b.type] }} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-[13px]"><b className="font-semibold">{b.code}</b><span className="rounded bg-sky-400/10 px-1.5 text-[11px] text-sky-300">{b.loc}</span></div>
                  <div className="truncate text-xs text-slate-400">{b.desc}</div>
                </div>
                <div className="text-right text-xs tabular-nums text-slate-300">{fmt(b.qty)} <span className="text-slate-500">{b.um}</span></div>
              </Command.Item>
            );
          })}
        </Command.List>
      </div>
    </Command.Dialog>
  );
}

/* ───────── dock lateral ───────── */
export function Dock() {
  const { drawer, setDrawer, setPalette } = useStore(useShallow((s) => ({ drawer: s.drawer, setDrawer: s.setDrawer, setPalette: s.setPalette })));
  const items = [
    { k: 'search', icon: Search, label: 'Buscar', on: () => setPalette(true) },
    { k: 'data', icon: Database, label: 'Datos SAP', on: () => setDrawer('data') },
    { k: 'racks', icon: LayoutGrid, label: 'Racks', on: () => setDrawer('racks') },
    { k: 'layers', icon: Eye, label: 'Capas y vista', on: () => setDrawer('layers') },
  ] as const;
  return (
    <div className="glass pointer-events-auto flex flex-col gap-1 rounded-2xl p-1.5">
      {items.map(({ k, icon: Icon, label, on }) => (
        <button key={k} onClick={on} title={label} className={clsx('group relative grid h-11 w-11 place-items-center rounded-xl transition', drawer === k ? 'bg-sky-500 text-slate-950' : 'text-slate-300 hover:bg-white/10')}>
          <Icon size={19} />
          <span className="pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-xs opacity-0 shadow-lg transition group-hover:opacity-100">{label}</span>
        </button>
      ))}
    </div>
  );
}

/* ───────── vistas rápidas ───────── */
export function ViewBar() {
  const flyTo = useStore((s) => s.flyTo);
  const list: [ViewKey, string][] = [['general', 'General'], ['planta', 'Planta'], ['oficinas', 'Oficinas'], ['mezanine', 'Mezanine'], ['entrada', 'Nivel de piso']];
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-4 flex flex-col items-center gap-2">
      <div className="glass pointer-events-auto flex gap-1 rounded-2xl p-1.5">
        {list.map(([k, n]) => (
          <button key={k} onClick={() => flyTo([...VIEWS[k].target] as [number, number, number], [...VIEWS[k].cam] as [number, number, number])} className="rounded-xl px-3.5 py-1.5 text-[13px] font-medium text-slate-300 transition hover:bg-white/10 hover:text-white">{n}</button>
        ))}
      </div>
      <div className="text-[11px] text-slate-500">Arrastra: orbitar · Clic derecho: mover · Rueda: zoom · W A S D / Q E: desplazarse</div>
    </div>
  );
}

/* ───────── inspector ───────── */
export function Inspector() {
  const { selected, boxes, config, select, flyTo, placements } = useStore(useShallow((s) => ({ selected: s.selected, boxes: s.boxes, config: s.config, select: s.select, flyTo: s.flyTo, placements: s.placements })));
  const b = selected !== null ? boxes[selected] : null;
  const zone = b && b.placement.kind === 'zone' ? config.zones.find((z) => z.id === (b.placement as { zone: string }).zone)?.name : null;
  return (
    <AnimatePresence>
      {b && selected !== null && (
        <motion.aside key="insp" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 24 }} transition={{ type: 'spring', stiffness: 380, damping: 34 }} className="glass pointer-events-auto absolute right-4 top-24 w-[340px] overflow-hidden rounded-2xl">
          <div className="h-1" style={{ background: TYPE_COLOR[b.type] }} />
          <div className="p-4">
            <div className="flex items-start justify-between gap-2">
              <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#0b1220]" style={{ background: TYPE_COLOR[b.type] }}>{TYPE_LABEL[b.type]}</span>
              <button onClick={() => select(null)} className="rounded-md p-1 text-slate-400 hover:bg-white/10 hover:text-white"><X size={15} /></button>
            </div>
            <h3 className="mt-2 text-lg font-semibold tracking-tight">{b.code}</h3>
            <p className="text-sm leading-snug text-slate-300">{b.desc}</p>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-white/[0.05] p-3"><div className="text-[10px] uppercase tracking-wider text-slate-500">Cantidad</div><div className="text-xl font-semibold tabular-nums">{fmt(b.qty)} <span className="text-sm font-normal text-slate-400">{b.um}</span></div></div>
              <div className="rounded-xl bg-white/[0.05] p-3"><div className="text-[10px] uppercase tracking-wider text-slate-500">Ubicación</div><div className="text-xl font-semibold tabular-nums text-sky-300">{b.loc}</div>{zone && <div className="text-[11px] text-slate-400">{zone}</div>}</div>
            </div>
            {b.issue && <div className="mt-2 rounded-lg bg-amber-400/10 px-3 py-2 text-xs text-amber-300">{b.issue}</div>}

            {Object.keys(b.extra).length > 0 && (
              <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[12px]">
                {Object.entries(b.extra).map(([k, v]) => (<div key={k} className="contents"><dt className="text-slate-500">{k}</dt><dd className="text-right text-slate-200">{v}</dd></div>))}
              </dl>
            )}
            {b.lotes.length > 0 && (
              <div className="mt-3">
                <div className="mb-1 text-[10px] uppercase tracking-wider text-slate-500">Lotes ({b.lotes.length})</div>
                <div className="scroll max-h-36 overflow-auto rounded-xl bg-white/[0.04]">
                  {b.lotes.map((l) => (<div key={l.lote} className="flex justify-between border-b border-white/5 px-3 py-1.5 text-[12px] last:border-0"><span>{l.lote}</span><span className="tabular-nums text-slate-300">{fmt(l.qty)} {b.um}</span></div>))}
                </div>
              </div>
            )}
            <div className="mt-3 flex gap-2">
              <button onClick={() => { const p = placements.pos; const t: [number, number, number] = [p[selected * 3], p[selected * 3 + 1], p[selected * 3 + 2]]; flyTo(t, [t[0] + 3.5, t[1] + 3.5, t[2] + 6]); }} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-white/[0.07] py-1.5 text-[13px] hover:bg-white/[0.12]"><Crosshair size={14} /> Centrar</button>
              <button onClick={() => navigator.clipboard?.writeText(`${b.code}\t${b.loc}`)} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-white/[0.07] py-1.5 text-[13px] hover:bg-white/[0.12]"><Copy size={14} /> Copiar</button>
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

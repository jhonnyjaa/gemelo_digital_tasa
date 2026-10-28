import { useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { AnimatePresence, motion } from 'motion/react';
import { Database, Sparkles } from 'lucide-react';
import { useStore } from './store';
import { Scene } from './scene/Scene';
import { Dock, Inspector, Palette, TopBar, ViewBar } from './ui/Chrome';
import { DataDrawer, LayersDrawer, RacksDrawer, ZonesDrawer } from './ui/Drawers';
import { Btn } from './ui/kit';

function Empty() {
  const { stats, loadDemo, setDrawer, drawer } = useStore(useShallow((s) => ({ stats: s.stats, loadDemo: s.loadDemo, setDrawer: s.setDrawer, drawer: s.drawer })));
  if (stats.boxes > 0 || drawer) return null;
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass pointer-events-auto absolute bottom-24 left-1/2 w-[420px] -translate-x-1/2 rounded-2xl p-5 text-center">
      <h3 className="text-[15px] font-semibold">El almacén está vacío</h3>
      <p className="mt-1 text-sm text-slate-400">Carga los Excel de SAP para ubicar los artículos en el modelo, o prueba con datos de ejemplo.</p>
      <div className="mt-4 flex justify-center gap-2">
        <Btn variant="primary" onClick={() => setDrawer('data')}><Database size={14} /> Cargar Excel</Btn>
        <Btn onClick={() => loadDemo(6000)}><Sparkles size={14} /> Datos demo</Btn>
      </div>
    </motion.div>
  );
}

function WalkHud() {
  const setWalk = useStore((s) => s.setWalk);
  return (
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/80 ring-1 ring-black/40" />
      <div className="glass pointer-events-auto absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-4 rounded-2xl px-4 py-2 text-[12px] text-slate-300">
        <span><b className="text-slate-100">W A S D</b> moverse</span>
        <span><b className="text-slate-100">Ratón</b> mirar</span>
        <span><b className="text-slate-100">Shift</b> correr</span>
        <span>Escaleras: camina hacia ellas</span>
        <button onClick={() => setWalk(false)} className="rounded-lg bg-white/10 px-2.5 py-1 font-semibold text-slate-100 hover:bg-white/20">Esc · Salir</button>
      </div>
    </div>
  );
}

export default function App() {
  const init = useStore((s) => s.init);
  const ready = useStore((s) => s.ready);
  const drawer = useStore((s) => s.drawer);
  const walk = useStore((s) => s.walk);
  useEffect(() => {
    init();
  }, [init]);

  return (
    <div className="relative h-full w-full">
      {ready && <Scene />}
      {walk && <WalkHud />}
      <div className="pointer-events-none absolute inset-0" style={{ display: walk ? 'none' : undefined }}>
        <TopBar />
        <div className="absolute bottom-24 left-4 top-24 flex items-start gap-3">
          <Dock />
          <AnimatePresence mode="wait">
            {drawer && (
              <motion.div key={drawer} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ type: 'spring', stiffness: 420, damping: 36 }} className="pointer-events-auto max-h-full">
                {drawer === 'data' && <DataDrawer />}
                {drawer === 'racks' && <RacksDrawer />}
                {drawer === 'zones' && <ZonesDrawer />}
                {drawer === 'layers' && <LayersDrawer />}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <Inspector />
        <Empty />
        <ViewBar />
      </div>
      <Palette />
    </div>
  );
}

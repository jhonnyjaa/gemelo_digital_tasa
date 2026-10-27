import { useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { AnimatePresence, motion } from 'motion/react';
import { Database, Sparkles } from 'lucide-react';
import { useStore } from './store';
import { Scene } from './scene/Scene';
import { Dock, Inspector, Palette, TopBar, ViewBar } from './ui/Chrome';
import { DataDrawer, LayersDrawer, RacksDrawer } from './ui/Drawers';
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

export default function App() {
  const init = useStore((s) => s.init);
  const ready = useStore((s) => s.ready);
  const drawer = useStore((s) => s.drawer);
  useEffect(() => {
    init();
  }, [init]);

  return (
    <div className="relative h-full w-full">
      {ready && <Scene />}
      <div className="pointer-events-none absolute inset-0">
        <TopBar />
        <div className="absolute bottom-24 left-4 top-24 flex items-start gap-3">
          <Dock />
          <AnimatePresence mode="wait">
            {drawer && (
              <motion.div key={drawer} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ type: 'spring', stiffness: 420, damping: 36 }} className="pointer-events-auto max-h-full">
                {drawer === 'data' && <DataDrawer />}
                {drawer === 'racks' && <RacksDrawer />}
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

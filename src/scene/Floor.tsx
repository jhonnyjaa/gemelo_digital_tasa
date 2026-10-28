import { useDeferredValue, useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import { Grid } from '@react-three/drei';
import { useStore } from '../store';
import { toWorld } from '../lib/layout';
import { FLOOR_TOP, paintFloor } from '../lib/floor';

export function Floor() {
  const cfgNow = useStore((s) => s.config);
  const cfg = useDeferredValue(cfgNow); // al editar racks no bloquea la escritura mientras se repinta
  const theme = useStore((s) => s.theme);
  const dyn = useStore((s) => s.dynZones);
  const maxAniso = useThree((s) => s.gl.capabilities.getMaxAnisotropy());
  const tex = useMemo(() => paintFloor({ ...cfg, zones: [...cfg.zones, ...dyn] }, theme), [cfg, dyn, theme]);
  useEffect(() => {
    tex.anisotropy = maxAniso;
    return () => tex.dispose();
  }, [tex, maxAniso]);

  const [W, H] = cfg.plan.size;
  const [cx, cz] = toWorld(cfg, [W / 2, FLOOR_TOP + (H - FLOOR_TOP) / 2]);
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, 0, cz]}>
        <planeGeometry args={[W * cfg.scale, (H - FLOOR_TOP) * cfg.scale]} />
        <meshStandardMaterial map={tex} roughness={0.42} metalness={0.08} envMapIntensity={0.7} />
      </mesh>
      <Grid
        position={[0, -0.05, 0]}
        args={[10, 10]}
        cellSize={5}
        cellThickness={0.6}
        cellColor={theme === 'dark' ? '#1e2631' : '#c3ccd7'}
        sectionSize={25}
        sectionThickness={1}
        sectionColor={theme === 'dark' ? '#2b3646' : '#aab6c5'}
        fadeDistance={420}
        fadeStrength={1.5}
        infiniteGrid
      />
    </group>
  );
}

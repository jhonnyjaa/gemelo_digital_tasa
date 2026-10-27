import { Suspense, useMemo } from 'react';
import { Billboard, Text } from '@react-three/drei';
import interFont from '@fontsource/inter/files/inter-latin-600-normal.woff?url';
import { useStore } from '../store';
import { BEAM_T, type RackLayout } from '../lib/layout';
import { Boxes, pushBox } from './Boxes';

function RackSet({ layouts, labels }: { layouts: RackLayout[]; labels: boolean }) {
  const { up, beam, deck, guard } = useMemo(() => {
    const up: number[] = [];
    const beam: number[] = [];
    const deck: number[] = [];
    const guard: number[] = [];
    for (const rl of layouts) {
      const H = rl.levels * rl.levelH;
      const upT = Math.min(0.09, rl.pitch * 0.16);
      const lat = rl.depth / 2 - upT / 2;
      const at = (x: number, l: number) => [rl.ox + rl.dx * x - rl.dz * l, rl.oz + rl.dz * x + rl.dx * l] as const;
      const main = rl.group === 'main';
      for (const s of rl.segs) {
        const xs = [...rl.colStart.slice(s.from, s.to), s.x1];
        for (const x of xs) {
          for (const side of [-1, 1]) {
            const [px, pz] = at(x, side * lat);
            pushBox(up, px, rl.baseY + H / 2, pz, upT, H, upT * 0.9, rl.yaw);
            if (main) pushBox(guard, px, rl.baseY + 0.2, pz, upT + 0.05, 0.4, upT + 0.05, rl.yaw);
          }
        }
        const mid = (s.x0 + s.x1) / 2;
        const len = s.x1 - s.x0;
        for (let l = 0; l < rl.levels; l++) {
          const y = rl.baseY + l * rl.levelH;
          for (const side of [-1, 1]) {
            const [px, pz] = at(mid, side * lat);
            pushBox(beam, px, y + BEAM_T / 2, pz, len, BEAM_T, 0.05, rl.yaw);
          }
          const [cx, cz] = at(mid, 0);
          pushBox(deck, cx, y + BEAM_T + 0.006, cz, len, 0.012, rl.depth - 0.04, rl.yaw);
        }
      }
    }
    return { up, beam, deck, guard };
  }, [layouts]);

  return (
    <group>
      <Boxes data={up} color="#2f5fd0" rough={0.45} metal={0.35} />
      <Boxes data={beam} color="#ff8a1f" rough={0.4} metal={0.3} />
      <Boxes data={deck} color="#b7c0cc" rough={0.7} metal={0.2} />
      <Boxes data={guard} color="#f5c518" rough={0.5} />
      {labels && (
        <Suspense fallback={null}>
        {layouts.map((rl) => {
          const main = rl.group === 'main';
          const back = main ? 1.6 : 0.5;
          const side = (rl.id % 2 ? 1 : -1) * (main ? 0.55 : 0.28);
          return (
            <Billboard key={rl.id} position={[rl.ox - rl.dx * back - rl.dz * side, rl.baseY + (main ? 2.2 : rl.levels * rl.levelH + 0.35), rl.oz - rl.dz * back + rl.dx * side]}>
              <Text font={interFont} fontSize={main ? 0.75 : 0.3} color="#ffb454" outlineWidth={main ? 0.05 : 0.025} outlineColor="#0b1220" anchorX="center" anchorY="middle" sdfGlyphSize={32} characters="0123456789">
                {rl.label}
              </Text>
            </Billboard>
          );
        })}
        </Suspense>
      )}
    </group>
  );
}

export function Racks() {
  const layouts = useStore((s) => s.layouts);
  const upper = useStore((s) => s.toggles.upperMezz);
  const labels = useStore((s) => s.toggles.labels);
  const on = useStore((s) => s.toggles.racks);
  const { base, mezzUp } = useMemo(() => {
    const all = [...layouts.values()];
    return { base: all.filter((r) => r.group !== 'mezzUp'), mezzUp: all.filter((r) => r.group === 'mezzUp') };
  }, [layouts]);
  if (!on) return null;
  return (
    <>
      <RackSet layouts={base} labels={labels} />
      {upper && <RackSet layouts={mezzUp} labels={labels} />}
    </>
  );
}

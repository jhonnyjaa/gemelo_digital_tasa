import { Suspense, useEffect, useRef, useState, type ElementRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { CameraControls, Environment, Lightformer, PerformanceMonitor } from '@react-three/drei';
import { Bloom, EffectComposer, N8AO, SMAA, ToneMapping } from '@react-three/postprocessing';
import { ACESFilmicToneMapping, NoToneMapping } from 'three';
import { ToneMappingMode } from 'postprocessing';
import { useStore } from '../store';
import { Floor } from './Floor';
import { Building } from './Building';
import { Racks } from './Racks';
import { Highlights, Items } from './Items';
import { Forklifts, People } from './Actors';

export const VIEWS = {
  general: { target: [4, 0, 2], cam: [34, 62, 74] },
  planta: { target: [4, 0, 2], cam: [4, 120, 2.1] },
  oficinas: { target: [45, 2, -6], cam: [26, 24, 30] },
  mezanine: { target: [51, 3, 0], cam: [32, 20, 34] },
  entrada: { target: [30, 1.6, 4], cam: [-8, 4, 14] },
} as const;
export type ViewKey = keyof typeof VIEWS;

const keys = new Set<string>();

function CameraRig() {
  const ctrl = useRef<ElementRef<typeof CameraControls>>(null);
  const fly = useStore((s) => s.fly);

  useEffect(() => {
    const typing = () => ['input', 'textarea', 'select'].includes((document.activeElement?.tagName ?? '').toLowerCase());
    const down = (e: KeyboardEvent) => !typing() && !e.metaKey && !e.ctrlKey && keys.add(e.key.toLowerCase());
    const up = (e: KeyboardEvent) => keys.delete(e.key.toLowerCase());
    const clear = () => keys.clear();
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', clear);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', clear);
    };
  }, []);

  useEffect(() => {
    const c = ctrl.current;
    if (!c) return;
    const v = fly ?? { target: VIEWS.general.target, cam: VIEWS.general.cam, key: 0 };
    c.setLookAt(v.cam[0], v.cam[1], v.cam[2], v.target[0], v.target[1], v.target[2], fly !== null);
  }, [fly]);

  useFrame((_, dt) => {
    const c = ctrl.current;
    if (!c || !keys.size) return;
    const dist = c.distance;
    const sp = Math.max(6, dist * 0.8) * (keys.has('shift') ? 2.5 : 1) * dt;
    const f = (keys.has('w') || keys.has('arrowup') ? 1 : 0) - (keys.has('s') || keys.has('arrowdown') ? 1 : 0);
    const r = (keys.has('d') || keys.has('arrowright') ? 1 : 0) - (keys.has('a') || keys.has('arrowleft') ? 1 : 0);
    const u = (keys.has('e') ? 1 : 0) - (keys.has('q') ? 1 : 0);
    if (f) c.forward(f * sp, false);
    if (r) c.truck(r * sp, 0, false);
    if (u) c.truck(0, -u * sp, false);
  });

  return (
    <CameraControls
      ref={ctrl}
      makeDefault
      minDistance={2}
      maxDistance={240}
      maxPolarAngle={Math.PI / 2.03}
      smoothTime={0.18}
      draggingSmoothTime={0.1}
      dollyToCursor
    />
  );
}

function ToneSwitch() {
  const gl = useThree((s) => s.gl);
  const quality = useStore((s) => s.quality);
  useEffect(() => {
    // con postproceso el tone mapping lo hace el compositor; sin él, el renderer
    gl.toneMapping = quality === 'low' ? ACESFilmicToneMapping : NoToneMapping;
    gl.toneMappingExposure = 1.05;
  }, [gl, quality]);
  return null;
}

function Effects() {
  const quality = useStore((s) => s.quality);
  if (quality === 'low') return null;
  const high = quality === 'high';
  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      <N8AO aoRadius={1.1} distanceFalloff={1.2} intensity={3} quality={high ? 'medium' : 'performance'} halfRes color="#0a0d12" />
      {high ? <Bloom mipmapBlur intensity={0.5} luminanceThreshold={1} radius={0.7} /> : <></>}
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      {high ? <SMAA /> : <></>}
    </EffectComposer>
  );
}

/** Ajusta la calidad según los FPS reales (solo en modo Auto). */
function Adaptive() {
  const stepQuality = useStore((s) => s.stepQuality);
  const mode = useStore((s) => s.qualityMode);
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setArmed(true), 6000); // ignora los FPS durante la carga inicial
    return () => clearTimeout(t);
  }, []);
  if (mode !== 'auto' || !armed) return null;
  return (
    <PerformanceMonitor
      ms={300}
      iterations={6}
      flipflops={2}
      onDecline={() => stepQuality(-1)}
      onIncline={() => stepQuality(1)}
      onFallback={() => stepQuality(-1)}
    />
  );
}

export function Scene() {
  const select = useStore((s) => s.select);
  const quality = useStore((s) => s.quality);
  const dark = useStore((s) => s.theme) === 'dark';
  const bg = dark ? '#0b1017' : '#e9eef4';
  return (
    <Canvas
      flat
      dpr={quality === 'high' ? [1, 1.75] : quality === 'medium' ? [1, 1.25] : 1}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      camera={{ position: [...VIEWS.general.cam], fov: 38, near: 0.2, far: 1200 }}
      onPointerMissed={() => select(null)}
    >
      <color attach="background" args={[bg]} />
      <fog attach="fog" args={[bg, 220, 520]} />
      <ToneSwitch />
      <Adaptive />
      <Environment resolution={256} frames={1} environmentIntensity={dark ? 0.5 : 0.85}>
        <color attach="background" args={[dark ? '#1a2230' : '#c9d6e6']} />
        <Lightformer form="rect" intensity={2.4} position={[0, 14, 0]} rotation-x={Math.PI / 2} scale={[40, 40, 1]} color="#fff4e6" />
        <Lightformer form="rect" intensity={1.2} position={[-20, 6, 0]} rotation-y={Math.PI / 2} scale={[30, 8, 1]} color="#cfe4ff" />
        <Lightformer form="rect" intensity={1.2} position={[20, 6, 0]} rotation-y={-Math.PI / 2} scale={[30, 8, 1]} color="#cfe4ff" />
        <Lightformer form="ring" intensity={2} position={[0, 8, -20]} scale={10} color="#ffd9a8" />
      </Environment>
      <ambientLight intensity={dark ? 0.12 : 0.4} />
      <directionalLight position={[60, 90, 40]} intensity={dark ? 1.05 : 1.5} color="#fff1dd" />
      <Suspense fallback={null}>
        <Floor />
      </Suspense>
      <Building />
      <Racks />
      <Items />
      <Highlights />
      <Forklifts />
      <People />
      <CameraRig />
      <Effects />
    </Canvas>
  );
}

import { useLayoutEffect, useRef } from 'react';
import { InstancedMesh, Object3D } from 'three';

/** Instancias de cajas: stride 8 = px,py,pz, sx,sy,sz, yaw, pitch */
export const pushBox = (a: number[], x: number, y: number, z: number, sx: number, sy: number, sz: number, yaw = 0, pitch = 0) =>
  a.push(x, y, z, sx, sy, sz, yaw, pitch);

interface Props {
  data: number[];
  color: string;
  rough?: number;
  metal?: number;
  emissive?: string;
  emissiveIntensity?: number;
  opacity?: number;
}

export function Boxes({ data, color, rough = 0.6, metal = 0, emissive, emissiveIntensity = 1, opacity = 1 }: Props) {
  const ref = useRef<InstancedMesh>(null);
  const n = Math.floor(data.length / 8);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new Object3D();
    for (let i = 0; i < n; i++) {
      const k = i * 8;
      o.position.set(data[k], data[k + 1], data[k + 2]);
      o.scale.set(data[k + 3], data[k + 4], data[k + 5]);
      o.rotation.set(0, data[k + 6], data[k + 7], 'YZX');
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  }, [data, n]);
  if (!n) return null;
  return (
    <instancedMesh key={n} ref={ref} args={[undefined, undefined, n]} frustumCulled={false} castShadow={false}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        color={color}
        roughness={rough}
        metalness={metal}
        emissive={emissive ?? '#000'}
        emissiveIntensity={emissiveIntensity}
        transparent={opacity < 1}
        opacity={opacity}
        toneMapped={!emissive}
      />
    </instancedMesh>
  );
}

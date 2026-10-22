import { useGLTF } from '@react-three/drei';
import type { Track } from '@winkrider/track';
import { useLayoutEffect, useMemo, useRef } from 'react';
import { Euler, Matrix4, Quaternion, Vector3, type BufferGeometry, type InstancedMesh, type Material, type Mesh } from 'three';

import { placeProps, type PropKind, type PropPlacement } from './prop-placement';

// Kenney City Kit (CC0, CREDITS.md). scale은 원본 단위를 m로 맞춘 값
const PROP_MODELS: Record<PropKind, { url: string; scale: number }> = {
  'building-a': { url: '/models3d/building-a.glb', scale: 8 },
  'building-c': { url: '/models3d/building-c.glb', scale: 8 },
  'building-f': { url: '/models3d/building-f.glb', scale: 8 },
  'building-k': { url: '/models3d/building-k.glb', scale: 8 },
  'tree-large': { url: '/models3d/tree-large.glb', scale: 10 },
  'tree-small': { url: '/models3d/tree-small.glb', scale: 10 },
  'street-light': { url: '/models3d/street-light.glb', scale: 10 },
};

interface Part {
  geometry: BufferGeometry;
  material: Material | Material[];
  /** 모델 안에서 이 부분의 위치·회전·크기 */
  matrix: Matrix4;
}

function InstancedPart({ part, placements, scale }: { part: Part; placements: PropPlacement[]; scale: number }) {
  const ref = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const placement = new Matrix4();
    const rotation = new Quaternion();
    const size = new Vector3(scale, scale, scale);
    placements.forEach((p, i) => {
      rotation.setFromEuler(new Euler(0, p.rotationY, 0));
      placement.compose(new Vector3(p.position.x, 0, p.position.z), rotation, size);
      mesh.setMatrixAt(i, placement.clone().multiply(part.matrix));
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [part, placements, scale]);
  return <instancedMesh ref={ref} args={[part.geometry, part.material, placements.length]} />;
}

/** 같은 종류의 소품을 모델 부분마다 InstancedMesh 하나로 그린다. 소품 수만큼 복제하면 그리기 호출이 너무 많아진다 */
function PropKindInstances({ kind, placements }: { kind: PropKind; placements: PropPlacement[] }) {
  const model = PROP_MODELS[kind];
  const { scene } = useGLTF(model.url);
  const parts = useMemo(() => {
    scene.updateMatrixWorld(true);
    const list: Part[] = [];
    scene.traverse((object) => {
      const mesh = object as Mesh;
      if (mesh.isMesh) list.push({ geometry: mesh.geometry, material: mesh.material, matrix: mesh.matrixWorld.clone() });
    });
    return list;
  }, [scene]);
  return (
    <>
      {parts.map((part, i) => (
        <InstancedPart key={i} part={part} placements={placements} scale={model.scale} />
      ))}
    </>
  );
}

/** 트랙 양옆의 건물, 나무, 가로등 */
export function Props({ track }: { track: Track }) {
  const byKind = useMemo(() => {
    const groups = new Map<PropKind, PropPlacement[]>();
    for (const placement of placeProps(track)) {
      groups.set(placement.kind, [...(groups.get(placement.kind) ?? []), placement]);
    }
    return [...groups];
  }, [track]);
  return (
    <group>
      {byKind.map(([kind, placements]) => (
        <PropKindInstances key={kind} kind={kind} placements={placements} />
      ))}
    </group>
  );
}

for (const { url } of Object.values(PROP_MODELS)) useGLTF.preload(url);

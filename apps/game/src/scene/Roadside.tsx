import type { Track } from '@smilerider/track';
import { Suspense, useLayoutEffect, useMemo, useRef } from 'react';
import { Object3D, type InstancedMesh } from 'three';

import { ModelErrorBoundary } from './ModelErrorBoundary';
import { Props } from './Props';
import { pillarPositions } from './track-geometry';

const PILLAR_MIN_HEIGHT = 3;
const PILLAR_EVERY = 20;
const PILLAR_SIZE = 1.6;
const ROAD_THICKNESS = 0.3;

/** 바닥과 고가 교각. 교각 위치도 트랙 중심선 데이터로 정한다 */
export function Roadside({ track }: { track: Track }) {
  const pillars = useMemo(() => pillarPositions(track, PILLAR_MIN_HEIGHT, PILLAR_EVERY), [track]);
  const ground = useMemo(() => {
    const xs = track.samples.map((s) => s.position.x);
    const zs = track.samples.map((s) => s.position.z);
    const [minX, maxX, minZ, maxZ] = [Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)];
    return { x: (minX + maxX) / 2, z: (minZ + maxZ) / 2, size: Math.max(maxX - minX, maxZ - minZ) + 800 };
  }, [track]);

  const ref = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const dummy = new Object3D();
    pillars.forEach((p, i) => {
      const height = p.y - ROAD_THICKNESS;
      dummy.position.set(p.x, height / 2, p.z);
      dummy.scale.set(PILLAR_SIZE, height, PILLAR_SIZE);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [pillars]);

  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[ground.x, -0.05, ground.z]}>
        <planeGeometry args={[ground.size, ground.size]} />
        <meshStandardMaterial color="#7cb26a" />
      </mesh>
      <instancedMesh ref={ref} args={[undefined, undefined, pillars.length]}>
        <boxGeometry />
        <meshStandardMaterial color="#a3a3a3" />
      </instancedMesh>
      {/* 소품은 불러오는 대로 나타난다. 그동안에도, 불러오지 못해도 게임은 진행된다 */}
      <ModelErrorBoundary fallback={null}>
        <Suspense fallback={null}>
          <Props track={track} />
        </Suspense>
      </ModelErrorBoundary>
    </group>
  );
}

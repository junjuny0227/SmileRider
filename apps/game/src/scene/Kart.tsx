import { forwardRef, Suspense } from 'react';
import type { Group } from 'three';

import { KartModel } from './KartModel';
import { ModelErrorBoundary } from './ModelErrorBoundary';

// 모델을 불러오는 동안 보여 줄 1.6 × 0.6 × 2.4m 상자
function KartPlaceholder() {
  return (
    <mesh position={[0, 0.3, 0]}>
      <boxGeometry args={[1.6, 0.6, 2.4]} />
      <meshStandardMaterial color="#2ec4b6" />
    </mesh>
  );
}

/** 플레이어 카트. 위치와 방향은 RaceScreen이 ref로 직접 바꾼다 */
export const Kart = forwardRef<Group>(function Kart(_props, ref) {
  return (
    <group ref={ref}>
      {/* 모델을 불러오는 동안, 그리고 불러오지 못했을 때는 상자를 보여 준다 */}
      <ModelErrorBoundary fallback={<KartPlaceholder />}>
        <Suspense fallback={<KartPlaceholder />}>
          <KartModel />
        </Suspense>
      </ModelErrorBoundary>
    </group>
  );
});

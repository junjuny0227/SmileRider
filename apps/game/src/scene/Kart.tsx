import { forwardRef } from 'react';
import type { Group } from 'three';

/** 초기 카트. 1.6 × 0.6 × 2.4m 상자에 운전석 표시만 얹었다. 위치와 방향은 RaceScreen이 ref로 직접 바꾼다 */
export const Kart = forwardRef<Group>(function Kart(_props, ref) {
  return (
    <group ref={ref}>
      <mesh position={[0, 0.3, 0]}>
        <boxGeometry args={[1.6, 0.6, 2.4]} />
        <meshStandardMaterial color="#e5484d" />
      </mesh>
      <mesh position={[0, 0.85, -0.3]}>
        <boxGeometry args={[0.8, 0.5, 0.8]} />
        <meshStandardMaterial color="#ffd23f" />
      </mesh>
    </group>
  );
});

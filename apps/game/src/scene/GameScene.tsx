import type { Track } from '@winkrider/track';
import type { ReactNode } from 'react';

import { Roadside } from './Roadside';
import { TrackMesh } from './TrackMesh';

const SKY = '#9fd3ff';

/** 하늘, 조명, 트랙, 주변 환경. 카트와 카메라는 children으로 받는다 */
export function GameScene({ track, children }: { track: Track; children?: ReactNode }) {
  return (
    <>
      <color attach="background" args={[SKY]} />
      <fog attach="fog" args={[SKY, 150, 700]} />
      <hemisphereLight args={['#ffffff', '#6a8f5a', 0.9]} />
      <directionalLight position={[200, 300, 100]} intensity={1.6} />
      <TrackMesh track={track} />
      <Roadside track={track} />
      {children}
    </>
  );
}

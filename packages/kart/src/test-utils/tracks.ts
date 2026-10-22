import { buildTrack, type TrackControlPoint, type TrackDefinition } from '@winkrider/track';

import { createRibbonSurface } from '../surface.js';

const p = (x: number, y: number, z: number, width: number): TrackControlPoint => ({
  position: { x, y, z },
  width,
});

// 경기장 모양: 서쪽 직선(x = 0, +Z 방향 500m) → 북쪽 반원 → 동쪽 직선 → 남쪽 반원
function stadium(width: number, hill: boolean): TrackDefinition {
  const y = (z: number) => (hill ? Math.max(0, Math.min(20, ((z - 100) / 300) * 20)) : 0);
  return {
    id: hill ? 'hill' : 'stadium',
    name: 'test',
    laps: 2,
    checkpoints: [0.25, 0.5, 0.75],
    controlPoints: [
      ...[0, 100, 200, 300, 400, 500].map((z) => p(0, y(z), z, width)),
      p(14.6, y(500), 535.4, width),
      p(50, y(500), 550, width),
      p(85.4, y(500), 535.4, width),
      ...[500, 400, 300, 200, 100, 0].map((z) => p(100, y(z), z, width)),
      p(85.4, 0, -35.4, width),
      p(50, 0, -50, width),
      p(14.6, 0, -35.4, width),
    ],
  };
}

/** 폭 10m 경기장. 서쪽 직선 시작점(s = 0)에서 +Z를 본다 */
export const stadiumSurface = () => createRibbonSurface(buildTrack(stadium(10, false)));

/** 폭 400m 경기장. 벽에 닿지 않고 조향을 시험할 때 쓴다 */
export const openSurface = () => createRibbonSurface(buildTrack(stadium(400, false)));

/** 서쪽 직선이 z 100 ~ 400에서 높이 0 → 20으로 오르는 경기장 */
export const hillSurface = () => createRibbonSurface(buildTrack(stadium(10, true)));

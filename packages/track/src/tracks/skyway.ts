import type { TrackControlPoint, TrackDefinition } from '../types.js';

const ROAD = 16;
const ELEVATED = 12;

const p = (x: number, y: number, z: number, width = ROAD): TrackControlPoint => ({
  position: { x, y, z },
  width,
});

/**
 * 첫 트랙. 카트라이더 "빌리지 고가의 질주"에서 구간 흐름만 가져온 오마주이며 배치는 직접 만들었다.
 * 출발 → 부스터를 모으는 S자 커브 → 오르막 → 긴 고가 직선 → 고가 위 U턴 → 급경사 내리막 → 복귀
 */
export const skyway: TrackDefinition = {
  id: 'skyway',
  name: '스카이웨이',
  laps: 2,
  checkpoints: [0.25, 0.5, 0.75],
  controlPoints: [
    // 출발선 (남쪽 직선, -X 방향)
    p(140, 0, -40),
    p(90, 0, -40),
    p(60, 0, -40),
    // 남서쪽 커브 → 북쪽으로
    p(17.6, 0, -22.4),
    p(0, 0, 20),
    // 부스터를 모으는 S자 커브
    p(0, 0, 60),
    p(12, 0, 110),
    p(-10, 0, 170),
    p(0, 0, 215),
    p(0, 0, 240),
    // 북서쪽 커브와 오르막
    p(17.6, 1, 282.4),
    p(60, 2, 300),
    p(100, 5, 300, 14),
    p(145, 11, 300, ELEVATED),
    // 고가 직선
    p(200, 12, 300, ELEVATED),
    p(330, 12, 300, ELEVATED),
    p(460, 12, 300, ELEVATED),
    // 고가 위 U턴
    p(495.4, 12, 285.4, ELEVATED),
    p(510, 12, 250, ELEVATED),
    p(495.4, 12, 214.6, ELEVATED),
    p(460, 12, 200, ELEVATED),
    // 급경사 내리막
    p(430, 11, 200, ELEVATED),
    p(400, 6, 200, 14),
    p(370, 1, 200),
    p(330, 0, 200),
    // 남쪽으로 꺾어 복귀
    p(294.6, 0, 185.4),
    p(280, 0, 150),
    p(280, 0, 90),
    p(280, 0, 10),
    p(265.4, 0, -25.4),
    p(230, 0, -40),
    p(190, 0, -40),
  ],
};

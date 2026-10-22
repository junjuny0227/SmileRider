import type { Vec3 } from '@smilerider/track';

export interface ControlInput {
  /** -1 = 왼쪽 최대, 1 = 오른쪽 최대 */
  steer: number;
  /** 0 ~ 1 */
  throttle: number;
  /** 누르고 있는 동안 true */
  drift: boolean;
  /** 부스트를 요청한 틱에만 true */
  boost: boolean;
}

export const NO_INPUT: ControlInput = { steer: 0, throttle: 0, drift: false, boost: false };

export interface KartState {
  position: Vec3;
  /** 라디안. 앞 방향은 (sin h, 0, cos h), 커지면 왼쪽으로 돈다 */
  heading: number;
  speed: number;
  s: number;
  lateral: number;
  up: Vec3;
  driftAngle: number;
  drifting: boolean;
  boostGauge: number;
  boosters: number;
  boostTimeLeft: number;
  touchingWall: boolean;
}

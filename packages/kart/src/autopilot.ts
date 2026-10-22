import type { TrackSurface } from './surface.js';
import type { ControlInput, KartState } from './types.js';

const STEER_GAIN = 2;

/**
 * 엑셀을 끝까지 밟고 앞쪽 중심선을 따라 조향한다. 드리프트와 부스트는 쓰지 않는다.
 * 입력 재생 테스트의 기준 데이터를 만들고 E2E에서 키보드 모드를 대신 운전할 때 쓴다.
 */
export function autopilotInput(state: KartState, surface: TrackSurface): ControlInput {
  const lookahead = Math.max(10, state.speed * 0.6);
  const target = surface.pointAt(state.s + lookahead, 0);
  const desired = Math.atan2(target.x - state.position.x, target.z - state.position.z);
  let error = desired - state.heading;
  error = Math.atan2(Math.sin(error), Math.cos(error));
  // 목표가 왼쪽(error > 0)이면 왼쪽 조향(steer < 0)
  const steer = Math.max(-1, Math.min(1, -error * STEER_GAIN));
  return { steer, throttle: 1, drift: false, boost: false };
}

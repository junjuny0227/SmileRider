import { TICK_DT } from '@winkrider/kart';

/** 탭을 오래 비웠다 돌아와도 한 프레임에 몰아서 계산하는 틱 수의 상한 */
export const MAX_TICKS_PER_FRAME = 5;

// 1/60초 프레임이 부동소수점 오차로 0틱이 되지 않도록 두는 여유
const EPSILON = 1e-9;

/**
 * 화면 프레임 간격을 주행 로직의 고정 틱(초당 60번)으로 나눈다.
 * alpha는 직전 틱과 다음 틱 사이의 보간 비율(0~1)이다.
 */
export function advanceFixedStep(accumulator: number, frameDt: number) {
  const dt = Number.isFinite(frameDt) && frameDt > 0 ? frameDt : 0;
  let total = accumulator + dt;
  let ticks = Math.floor((total + EPSILON) / TICK_DT);
  if (ticks > MAX_TICKS_PER_FRAME) {
    ticks = MAX_TICKS_PER_FRAME;
    total = 0;
  } else {
    total = Math.max(0, total - ticks * TICK_DT);
  }
  return { ticks, accumulator: total, alpha: Math.min(1, total / TICK_DT) };
}

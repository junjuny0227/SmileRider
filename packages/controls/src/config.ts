/** 판정 기준. 초기값은 기획 10.9이며, 플레이하면서 이 파일에서만 조정한다 */
export interface ControlsConfig {
  /** 평소 값을 재는 시간(s) */
  neutralSeconds: number;
  /** 보정 실패 기준: 최대 값 - 평소 값이 이보다 작으면 실패 */
  minRange: number;
  steerDeadzone: number;
  /** 두 눈 보정값이 모두 이 이상이면 깜빡임으로 보고 조향 0 */
  blinkIgnore: number;
  throttleLow: number;
  throttleHigh: number;
  tiltDeadzoneDeg: number;
  tiltFullDeg: number;
  /** 스무딩에서 새 값의 비중 */
  smoothing: number;
  gestureMinScore: number;
  /** 손동작을 인정하려면 연속으로 몇 번 인식돼야 하는지 */
  gestureStreak: number;
  faceLostPauseSeconds: number;
}

export const DEFAULT_CONTROLS_CONFIG: ControlsConfig = {
  neutralSeconds: 3,
  minRange: 0.15,
  steerDeadzone: 0.15,
  blinkIgnore: 0.5,
  throttleLow: 0.1,
  throttleHigh: 0.8,
  tiltDeadzoneDeg: 5,
  tiltFullDeg: 25,
  smoothing: 0.3,
  gestureMinScore: 0.6,
  gestureStreak: 2,
  faceLostPauseSeconds: 0.5,
};

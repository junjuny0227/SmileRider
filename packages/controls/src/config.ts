/** 판정 기준. 초기값은 기획 10.9이며, 플레이하면서 이 파일에서만 조정한다 */
export interface ControlsConfig {
  /** 평소 값을 재는 시간(s) */
  neutralSeconds: number;
  /** 보정 실패 기준: 최대 값 - 평소 값이 이보다 작으면 실패 */
  minRange: number;
  /** 평소 각도에서 이만큼 기울기 전에는 조향 0 (도) */
  tiltDeadzoneDeg: number;
  /** 평소 각도에서 이만큼 기울이면 최대 조향 (도) */
  tiltFullDeg: number;
  /** 스무딩에서 새 값의 비중 */
  smoothing: number;
  /** 입 벌림 보정값이 이 이상이면 드리프트 */
  driftOn: number;
  /** 웃음 보정값이 이 이상이면 부스트 */
  boostOn: number;
  /** 웃음 보정값이 이보다 내려가야 다음 부스트를 낼 수 있다 */
  boostRearm: number;
  /** 드리프트와 부스트를 인정하려면 연속으로 몇 프레임 넘어야 하는지 */
  confirmFrames: number;
  faceLostPauseSeconds: number;
}

export const DEFAULT_CONTROLS_CONFIG: ControlsConfig = {
  neutralSeconds: 3,
  minRange: 0.15,
  tiltDeadzoneDeg: 5,
  tiltFullDeg: 25,
  smoothing: 0.3,
  driftOn: 0.4,
  boostOn: 0.6,
  boostRearm: 0.45,
  confirmFrames: 2,
  faceLostPauseSeconds: 0.5,
};

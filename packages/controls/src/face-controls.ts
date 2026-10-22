import { NO_INPUT, type ControlInput } from '@smilerider/kart';

import { normalize } from './calibration.js';
import type { ControlsConfig } from './config.js';
import type { Calibration, VisionFrame } from './types.js';

export interface FaceControlsState {
  steer: number;
  /** 입 벌림이 드리프트 기준 이상인 연속 프레임 수 */
  jawStreak: number;
  /** 드리프트 중이 아니면서 웃음이 발동 기준 이상인 연속 프레임 수 */
  smileStreak: number;
  /** false면 웃음이 재준비 기준 아래로 내려가야 다음 부스트가 나간다 */
  boostArmed: boolean;
}

export function createFaceControlsState(): FaceControlsState {
  return { steer: 0, jawStreak: 0, smileStreak: 0, boostArmed: true };
}

// 데드존 밖의 값을 0~1로 다시 펼친다
const rescale = (value: number, deadzone: number, full: number) => {
  const magnitude = Math.abs(value);
  if (magnitude < deadzone) return 0;
  return Math.sign(value) * Math.min(1, (magnitude - deadzone) / (full - deadzone));
};

/** 고개 기울이기 조향, 자동 엑셀, 입 벌려 드리프트, 웃어서 부스트 (기획 3장) */
export function updateFaceControls(
  state: FaceControlsState,
  frame: VisionFrame,
  calibration: Calibration,
  config: ControlsConfig,
): { state: FaceControlsState; input: ControlInput } {
  const face = frame.face;
  if (!face) {
    // 웃는 채로 얼굴이 돌아와도 부스트가 다시 나가지 않도록 boostArmed는 그대로 둔다
    return { state: { ...state, steer: 0, jawStreak: 0, smileStreak: 0 }, input: NO_INPUT };
  }

  const { neutral, max } = calibration;
  const jaw = normalize(face.blendshapes.jawOpen, neutral.jawOpen, max.jawOpen);
  const smile = normalize(face.blendshapes.mouthSmile, neutral.mouthSmile, max.mouthSmile);

  const jawStreak = jaw >= config.driftOn ? state.jawStreak + 1 : 0;
  // 입을 크게 벌린 웃음은 드리프트로 본다
  const smileStreak = smile >= config.boostOn && jaw < config.driftOn ? state.smileStreak + 1 : 0;
  let boostArmed = state.boostArmed;
  const boost = boostArmed && smileStreak >= config.confirmFrames;
  if (boost) boostArmed = false;
  if (smile < config.boostRearm) boostArmed = true;

  const tilt = (face.headRollDeg - calibration.neutralRollDeg) * calibration.tiltSign;
  const target = rescale(tilt, config.tiltDeadzoneDeg, config.tiltFullDeg);
  const steer = state.steer + config.smoothing * (target - state.steer);

  return {
    state: { steer, jawStreak, smileStreak, boostArmed },
    input: { steer, throttle: 1, drift: jawStreak >= config.confirmFrames, boost },
  };
}

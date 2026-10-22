import type { ControlInput } from '@winkrider/kart';

import { normalize } from './calibration.js';
import type { ControlsConfig } from './config.js';
import type { Calibration, FaceFrame, VisionFrame } from './types.js';

export type SteeringMode = 'wink' | 'headTilt';

export interface FaceControlsState {
  steer: number;
  throttle: number;
  fistStreak: number;
  thumbStreak: number;
  drifting: boolean;
  /** 엄지 척이 인정된 상태. 풀어야 다음 부스트를 낼 수 있다 */
  thumbActive: boolean;
}

export function createFaceControlsState(): FaceControlsState {
  return { steer: 0, throttle: 0, fistStreak: 0, thumbStreak: 0, drifting: false, thumbActive: false };
}

// 데드존 밖의 값을 0~1로 다시 펼친다
const rescale = (value: number, deadzone: number, full: number) => {
  const magnitude = Math.abs(value);
  if (magnitude < deadzone) return 0;
  return Math.sign(value) * Math.min(1, (magnitude - deadzone) / (full - deadzone));
};

function steerTarget(face: FaceFrame, calibration: Calibration, mode: SteeringMode, tiltSign: 1 | -1, config: ControlsConfig) {
  if (mode === 'headTilt') {
    return rescale(face.headRollDeg * tiltSign, config.tiltDeadzoneDeg, config.tiltFullDeg);
  }
  const { neutral, max } = calibration;
  const eyeBlinkLeft = normalize(face.blendshapes.eyeBlinkLeft, neutral.eyeBlinkLeft, max.eyeBlinkLeft);
  const eyeBlinkRight = normalize(face.blendshapes.eyeBlinkRight, neutral.eyeBlinkRight, max.eyeBlinkRight);
  const [left, right] = calibration.swapEyes ? [eyeBlinkRight, eyeBlinkLeft] : [eyeBlinkLeft, eyeBlinkRight];
  if (left >= config.blinkIgnore && right >= config.blinkIgnore) return 0;
  // 왼쪽 눈을 감을수록 왼쪽(steer < 0)
  return -rescale(left - right, config.steerDeadzone, 1);
}

function throttleTarget(face: FaceFrame, calibration: Calibration, config: ControlsConfig) {
  const jaw = normalize(face.blendshapes.jawOpen, calibration.neutral.jawOpen, calibration.max.jawOpen);
  if (jaw < config.throttleLow) return 0;
  if (jaw >= config.throttleHigh) return 1;
  return (jaw - config.throttleLow) / (config.throttleHigh - config.throttleLow);
}

export function updateFaceControls(
  state: FaceControlsState,
  frame: VisionFrame,
  calibration: Calibration,
  mode: SteeringMode,
  tiltSign: 1 | -1,
  config: ControlsConfig,
): { state: FaceControlsState; input: ControlInput } {
  // 손동작: 이번 프레임에 손 인식을 하지 않았으면 그대로 둔다
  let { fistStreak, thumbStreak, drifting, thumbActive } = state;
  let boost = false;
  if (frame.handEvaluated) {
    const recognized = (name: string) =>
      frame.hand?.gesture === name && frame.hand.score >= config.gestureMinScore;
    fistStreak = recognized('Closed_Fist') ? fistStreak + 1 : 0;
    thumbStreak = recognized('Thumb_Up') ? thumbStreak + 1 : 0;
    drifting = fistStreak >= config.gestureStreak;
    const thumb = thumbStreak >= config.gestureStreak;
    boost = thumb && !thumbActive;
    thumbActive = thumb;
  }

  const face = frame.face;
  if (!face) {
    return {
      state: { steer: 0, throttle: 0, fistStreak, thumbStreak, drifting, thumbActive },
      input: { steer: 0, throttle: 0, drift: false, boost: false },
    };
  }

  const smooth = (prev: number, target: number) => prev + config.smoothing * (target - prev);
  const steer = smooth(state.steer, steerTarget(face, calibration, mode, tiltSign, config));
  const throttle = smooth(state.throttle, throttleTarget(face, calibration, config));
  return {
    state: { steer, throttle, fistStreak, thumbStreak, drifting, thumbActive },
    input: { steer, throttle, drift: drifting, boost },
  };
}

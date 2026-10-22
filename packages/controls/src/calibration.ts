import type { ControlsConfig } from './config.js';
import type { BlendshapeName, Blendshapes, FaceFrame } from './types.js';

const NAMES: BlendshapeName[] = ['eyeBlinkLeft', 'eyeBlinkRight', 'jawOpen'];

const faces = (frames: (FaceFrame | null)[]) => frames.filter((f): f is FaceFrame => f !== null);

const maxOf = (frames: FaceFrame[], name: BlendshapeName, fallback: number) =>
  frames.reduce((m, f) => Math.max(m, f.blendshapes[name]), fallback);

/** 얼굴이 보인 프레임만 평균낸다. 하나도 없으면 null */
export function averageNeutral(frames: (FaceFrame | null)[]): Blendshapes | null {
  const valid = faces(frames);
  if (valid.length === 0) return null;
  const result = { eyeBlinkLeft: 0, eyeBlinkRight: 0, jawOpen: 0 };
  for (const name of NAMES) {
    result[name] = valid.reduce((sum, f) => sum + f.blendshapes[name], 0) / valid.length;
  }
  return result;
}

export interface EyeCalibrationResult {
  swapEyes: boolean;
  /** eyeBlinkLeft의 최대 값 */
  maxLeft: number;
  /** eyeBlinkRight의 최대 값 */
  maxRight: number;
  leftOk: boolean;
  rightOk: boolean;
}

export function calibrateEyes(
  neutral: Blendshapes,
  leftWink: (FaceFrame | null)[],
  rightWink: (FaceFrame | null)[],
  config: ControlsConfig,
): EyeCalibrationResult {
  const left = faces(leftWink);
  const right = faces(rightWink);
  const rise = (frames: FaceFrame[], name: BlendshapeName) => maxOf(frames, name, neutral[name]) - neutral[name];

  // 실제 왼쪽 윙크에서 eyeBlinkRight가 더 오르면, 화면 기준 좌우가 뒤바뀐 것
  const swapEyes = rise(left, 'eyeBlinkRight') > rise(left, 'eyeBlinkLeft');
  // 각 값의 최대는 그 값이 가리키는 눈을 실제로 감은 단계에서 가져온다
  const maxLeft = maxOf(swapEyes ? right : left, 'eyeBlinkLeft', neutral.eyeBlinkLeft);
  const maxRight = maxOf(swapEyes ? left : right, 'eyeBlinkRight', neutral.eyeBlinkRight);

  return {
    swapEyes,
    maxLeft,
    maxRight,
    leftOk: maxLeft - neutral.eyeBlinkLeft >= config.minRange,
    rightOk: maxRight - neutral.eyeBlinkRight >= config.minRange,
  };
}

export function calibrateJaw(
  neutral: Blendshapes,
  open: (FaceFrame | null)[],
  config: ControlsConfig,
): { max: number; ok: boolean } {
  const max = maxOf(faces(open), 'jawOpen', neutral.jawOpen);
  return { max, ok: max - neutral.jawOpen >= config.minRange };
}

/** (raw - neutral) / (max - neutral)을 0~1로 자른다 */
export function normalize(raw: number, neutral: number, max: number): number {
  if (max <= neutral) return 0;
  return Math.min(1, Math.max(0, (raw - neutral) / (max - neutral)));
}

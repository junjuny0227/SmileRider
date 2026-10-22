import { averageNeutral, calibrateEyes, calibrateJaw, normalize } from './calibration.js';
import { DEFAULT_CONTROLS_CONFIG } from './config.js';
import type { Blendshapes, FaceFrame } from './types.js';

const f = (left: number, right = left, jaw = 0): FaceFrame => ({
  blendshapes: { eyeBlinkLeft: left, eyeBlinkRight: right, jawOpen: jaw },
  headRollDeg: 0,
});
const neutral: Blendshapes = { eyeBlinkLeft: 0.33, eyeBlinkRight: 0.33, jawOpen: 0.05 };

describe('DEFAULT_CONTROLS_CONFIG', () => {
  it('기획 10.9의 초기값', () => {
    expect(DEFAULT_CONTROLS_CONFIG).toEqual({
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
    });
  });
});

describe('averageNeutral', () => {
  it('얼굴이 없는 프레임을 빼고 평균낸다', () => {
    const result = averageNeutral([f(0.3, 0.3, 0.1), null, f(0.4, 0.4, 0.2)]);
    expect(result!.eyeBlinkLeft).toBeCloseTo(0.35, 6);
    expect(result!.eyeBlinkRight).toBeCloseTo(0.35, 6);
    expect(result!.jawOpen).toBeCloseTo(0.15, 6);
  });

  it('유효 프레임이 없으면 null', () => {
    expect(averageNeutral([null, null])).toBeNull();
    expect(averageNeutral([])).toBeNull();
  });
});

describe('calibrateEyes', () => {
  it('왼쪽 윙크에서 eyeBlinkLeft가 오르면 swapEyes false (기획 8.1 실측값)', () => {
    const result = calibrateEyes(
      neutral,
      [f(0.5, 0.4), f(0.66, 0.47), f(0.6, 0.45)],
      [f(0.4, 0.7)],
      DEFAULT_CONTROLS_CONFIG,
    );
    expect(result).toEqual({ swapEyes: false, maxLeft: 0.66, maxRight: 0.7, leftOk: true, rightOk: true });
  });

  it('왼쪽 윙크에서 eyeBlinkRight가 더 오르면 swapEyes true, 각 값의 최대는 실제로 그 눈을 감은 단계에서 가져온다', () => {
    const result = calibrateEyes(neutral, [f(0.4, 0.8)], [f(0.75, 0.45)], DEFAULT_CONTROLS_CONFIG);
    expect(result).toEqual({ swapEyes: true, maxLeft: 0.75, maxRight: 0.8, leftOk: true, rightOk: true });
  });

  it('범위가 0.15 미만이면 ok false', () => {
    const result = calibrateEyes(neutral, [f(0.45, 0.35)], [f(0.35, 0.7)], DEFAULT_CONTROLS_CONFIG);
    expect(result.leftOk).toBe(false);
    expect(result.rightOk).toBe(true);
  });

  it('얼굴이 없는 프레임은 무시하고, 전부 없으면 ok false', () => {
    const result = calibrateEyes(neutral, [null, f(0.7, 0.4), null], [null], DEFAULT_CONTROLS_CONFIG);
    expect(result.maxLeft).toBe(0.7);
    expect(result.leftOk).toBe(true);
    expect(result.rightOk).toBe(false);
  });
});

describe('calibrateJaw', () => {
  it('입 벌리기 단계의 최댓값과 범위 확인', () => {
    expect(calibrateJaw(neutral, [f(0, 0, 0.3), null, f(0, 0, 0.6)], DEFAULT_CONTROLS_CONFIG)).toEqual({ max: 0.6, ok: true });
    expect(calibrateJaw(neutral, [f(0, 0, 0.12)], DEFAULT_CONTROLS_CONFIG).ok).toBe(false);
    expect(calibrateJaw(neutral, [null], DEFAULT_CONTROLS_CONFIG).ok).toBe(false);
  });
});

describe('normalize', () => {
  it('평소 값에서 0, 최대 값에서 1, 범위 밖은 자른다', () => {
    expect(normalize(0.33, 0.33, 0.83)).toBe(0);
    expect(normalize(0.83, 0.33, 0.83)).toBe(1);
    expect(normalize(0.58, 0.33, 0.83)).toBeCloseTo(0.5, 6);
    expect(normalize(0.1, 0.33, 0.83)).toBe(0);
    expect(normalize(0.95, 0.33, 0.83)).toBe(1);
  });

  it('max <= neutral이면 0을 돌려준다 (0으로 나누지 않는다)', () => {
    expect(normalize(0.5, 0.4, 0.4)).toBe(0);
    expect(normalize(0.5, 0.4, 0.3)).toBe(0);
  });
});

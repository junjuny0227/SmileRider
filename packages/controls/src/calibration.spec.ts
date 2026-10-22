import { averageNeutral, calibrateMax, calibrateTilt, normalize } from './calibration.js';
import { DEFAULT_CONTROLS_CONFIG } from './config.js';
import type { Blendshapes, FaceFrame } from './types.js';

const cfg = DEFAULT_CONTROLS_CONFIG;
const f = (jaw: number, smile: number, roll = 0): FaceFrame => ({
  blendshapes: { jawOpen: jaw, mouthSmile: smile },
  headRollDeg: roll,
});

describe('DEFAULT_CONTROLS_CONFIG', () => {
  it('기획 10.9의 초기값', () => {
    expect(DEFAULT_CONTROLS_CONFIG).toEqual({
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
    });
  });
});

describe('averageNeutral', () => {
  it('얼굴이 없는 프레임을 빼고 표정 수치와 기울기를 평균낸다', () => {
    const result = averageNeutral([f(0.02, 0, 1), null, f(0.06, 0.1, 3)]);
    expect(result?.blendshapes.jawOpen).toBeCloseTo(0.04, 6);
    expect(result?.blendshapes.mouthSmile).toBeCloseTo(0.05, 6);
    expect(result?.rollDeg).toBeCloseTo(2, 6);
  });

  it('유효 프레임이 없으면 null', () => {
    expect(averageNeutral([null, null])).toBeNull();
    expect(averageNeutral([])).toBeNull();
  });
});

describe('calibrateTilt', () => {
  it('평소 각도에서 왼쪽 기울기가 +쪽이면 tiltSign -1, -쪽이면 1', () => {
    expect(calibrateTilt(0, [f(0, 0, 20), f(0, 0, 24)], cfg)).toEqual({ tiltSign: -1, ok: true });
    expect(calibrateTilt(0, [f(0, 0, -20)], cfg)).toEqual({ tiltSign: 1, ok: true });
  });

  it('평소 각도 기준 5° 미만이면 ok false (평소 8°, 측정 11°)', () => {
    expect(calibrateTilt(8, [f(0, 0, 11)], cfg).ok).toBe(false);
    expect(calibrateTilt(8, [null], cfg).ok).toBe(false);
  });
});

describe('calibrateMax', () => {
  const neutral: Blendshapes = { jawOpen: 0.04, mouthSmile: 0 };

  it('그 표정의 최댓값과 범위 확인', () => {
    expect(calibrateMax(neutral, [f(0.5, 0), null, f(0.79, 0)], 'jawOpen', cfg)).toEqual({ max: 0.79, ok: true });
    expect(calibrateMax(neutral, [f(0, 0.83)], 'mouthSmile', cfg)).toEqual({ max: 0.83, ok: true });
    expect(calibrateMax(neutral, [f(0, 0.1)], 'mouthSmile', cfg).ok).toBe(false);
  });

  it('얼굴이 없으면 최대 값은 평소 값이고 ok false', () => {
    expect(calibrateMax(neutral, [null], 'jawOpen', cfg)).toEqual({ max: 0.04, ok: false });
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

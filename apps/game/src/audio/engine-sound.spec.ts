import { engineGain, enginePitchHz } from './engine-sound';

describe('엔진 소리 수치', () => {
  it('속도 비율에 따라 60Hz에서 200Hz로 오르고, 부스트 중에는 1.2배', () => {
    expect(enginePitchHz(0, false)).toBe(60);
    expect(enginePitchHz(1, false)).toBe(200);
    expect(enginePitchHz(1, true)).toBe(240);
    expect(enginePitchHz(0.5, false)).toBe(130);
  });

  it('부스트로 최고 속도를 넘어도(속도 비율 1.4) 비율은 그대로 반영한다', () => {
    expect(enginePitchHz(1.4, false)).toBeCloseTo(256, 6);
  });

  it('음량은 엑셀에 따라 0.15에서 0.25', () => {
    expect(engineGain(0)).toBeCloseTo(0.15, 6);
    expect(engineGain(1)).toBeCloseTo(0.25, 6);
  });
});

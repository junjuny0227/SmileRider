import { advanceFixedStep, MAX_TICKS_PER_FRAME } from './fixed-step';

describe('advanceFixedStep', () => {
  it('1/60초 프레임이면 1틱', () => {
    const r = advanceFixedStep(0, 1 / 60);
    expect(r.ticks).toBe(1);
    expect(r.alpha).toBeCloseTo(0, 6);
  });

  it('1/120초 프레임 두 번이면 두 번째에 1틱, alpha는 0~1', () => {
    const first = advanceFixedStep(0, 1 / 120);
    expect(first.ticks).toBe(0);
    expect(first.alpha).toBeCloseTo(0.5, 6);
    const second = advanceFixedStep(first.accumulator, 1 / 120);
    expect(second.ticks).toBe(1);
    expect(second.alpha).toBeGreaterThanOrEqual(0);
    expect(second.alpha).toBeLessThan(1);
  });

  it('탭을 비웠다 돌아와 frameDt가 10초여도 최대 5틱이고, 쌓인 시간은 버린다', () => {
    const r = advanceFixedStep(0, 10);
    expect(MAX_TICKS_PER_FRAME).toBe(5);
    expect(r.ticks).toBe(5);
    expect(r.accumulator).toBe(0);
  });

  it('음수나 NaN 간격은 0으로 본다', () => {
    expect(advanceFixedStep(0, -1).ticks).toBe(0);
    expect(advanceFixedStep(0, Number.NaN).ticks).toBe(0);
  });
});

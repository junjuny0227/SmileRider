import { DEFAULT_KART_CONFIG, TICK_DT } from './config.js';
import { createKartState, stepKart } from './step-kart.js';
import type { TrackSurface } from './surface.js';
import { openSurface } from './test-utils/tracks.js';
import { NO_INPUT, type ControlInput, type KartState } from './types.js';

const DEG = Math.PI / 180;

function run(surface: TrackSurface, state: KartState, input: ControlInput, ticks: number): KartState {
  let s = state;
  for (let i = 0; i < ticks; i++) s = stepKart(s, input, surface, DEFAULT_KART_CONFIG, TICK_DT);
  return s;
}

const step = (surface: TrackSurface, state: KartState, input: ControlInput) =>
  stepKart(state, input, surface, DEFAULT_KART_CONFIG, TICK_DT);

const DRIFT_LEFT: ControlInput = { steer: -1, throttle: 1, drift: true, boost: false };

function moving(speed: number, extra: Partial<KartState> = {}) {
  const surface = openSurface();
  return { surface, state: { ...createKartState(surface, 100), speed, ...extra } };
}

describe('드리프트', () => {
  it('드리프트 중에는 회전 속도가 1.5배', () => {
    const { surface, state } = moving(20);
    const after = run(surface, state, DRIFT_LEFT, 60);
    expect((after.heading - state.heading) / DEG).toBeGreaterThan(132);
    expect((after.heading - state.heading) / DEG).toBeLessThan(138);
    expect(after.drifting).toBe(true);
  });

  it('드리프트 중에는 엑셀과 관계없이 초당 2m/s 감속', () => {
    const { surface, state } = moving(20);
    expect(run(surface, state, DRIFT_LEFT, 60).speed).toBeCloseTo(18, 1);
  });

  it('미끄러짐 각도는 30°를 넘지 않고, 드리프트를 풀면 0으로 돌아간다', () => {
    const { surface, state } = moving(25);
    let s = state;
    for (let i = 0; i < 120; i++) {
      s = step(surface, s, DRIFT_LEFT);
      expect(Math.abs(s.driftAngle)).toBeLessThanOrEqual(30 * DEG + 1e-9);
    }
    expect(Math.abs(s.driftAngle)).toBeCloseTo(30 * DEG, 5);
    s = run(surface, s, { ...NO_INPUT, throttle: 1 }, 30);
    expect(s.driftAngle).toBe(0);
    expect(s.drifting).toBe(false);
  });

  it('약 3초 드리프트하면 부스터 1개를 얻는다', () => {
    const { surface, state } = moving(30);
    const after = run(surface, state, DRIFT_LEFT, 180);
    expect(after.boosters).toBe(1);
    expect(after.boostGauge).toBeLessThan(0.1);
  });

  it('부스터는 최대 2개, 가득 차면 게이지는 1에서 멈춘다', () => {
    const { surface, state } = moving(30);
    const after = run(surface, state, DRIFT_LEFT, 540);
    expect(after.boosters).toBe(2);
    expect(after.boostGauge).toBe(1);
  });

  it('속도 10 이하에서는 drift를 눌러도 드리프트가 성립하지 않는다', () => {
    const { surface, state } = moving(8);
    const after = step(surface, state, { ...DRIFT_LEFT, throttle: 8 / 30 });
    expect(after.drifting).toBe(false);
    expect(after.boostGauge).toBe(0);
  });

  it('조향하지 않으면(|steer| <= 0.1) 드리프트가 성립하지 않는다', () => {
    const { surface, state } = moving(20);
    expect(step(surface, state, { ...DRIFT_LEFT, steer: 0.05 }).drifting).toBe(false);
  });
});

describe('부스트', () => {
  const BOOST: ControlInput = { ...NO_INPUT, throttle: 1, boost: true };
  const GO: ControlInput = { ...NO_INPUT, throttle: 1 };

  it('boost 입력 한 틱에 부스터 1개를 쓰고 1.5초 동안 42m/s를 유지한다', () => {
    const { surface, state } = moving(30, { boosters: 1 });
    let s = step(surface, state, BOOST);
    expect(s.speed).toBe(42);
    expect(s.boosters).toBe(0);
    s = run(surface, s, GO, 89);
    expect(s.speed).toBe(42);
    expect(s.boostTimeLeft).toBe(0);
  });

  it('부스트가 끝나면 초당 5m/s로 30까지 줄어든다', () => {
    const { surface, state } = moving(30, { boosters: 1 });
    let s = run(surface, step(surface, state, BOOST), GO, 89);
    s = run(surface, s, GO, 60);
    expect(s.speed).toBeCloseTo(37, 1);
    s = run(surface, s, GO, 120);
    expect(s.speed).toBe(30);
  });

  it('부스트 중에 boost를 다시 넣어도 부스터를 쓰지 않는다', () => {
    const { surface, state } = moving(30, { boosters: 2 });
    let s = step(surface, state, BOOST);
    s = run(surface, s, GO, 30);
    s = step(surface, s, BOOST);
    expect(s.boosters).toBe(1);
  });

  it('부스터가 없으면 boost 입력은 무시된다', () => {
    const { surface, state } = moving(30);
    const s = step(surface, state, BOOST);
    expect(s.speed).toBe(30);
    expect(s.boostTimeLeft).toBe(0);
  });
});

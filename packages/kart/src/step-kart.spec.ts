import { DEFAULT_KART_CONFIG, TICK_DT } from './config.js';
import { createKartState, stepKart } from './step-kart.js';
import type { TrackSurface } from './surface.js';
import { hillSurface, openSurface, stadiumSurface } from './test-utils/tracks.js';
import { NO_INPUT, type ControlInput, type KartState } from './types.js';

function run(surface: TrackSurface, state: KartState, input: ControlInput, ticks: number): KartState {
  let s = state;
  for (let i = 0; i < ticks; i++) s = stepKart(s, input, surface, DEFAULT_KART_CONFIG, TICK_DT);
  return s;
}

const deg = (rad: number) => (rad * 180) / Math.PI;
const hold = (speed: number): ControlInput => ({ ...NO_INPUT, throttle: speed / 30 });

describe('createKartState', () => {
  it('중심선 위에서 진행 방향을 보고 정지해 있다', () => {
    const surface = stadiumSurface();
    const state = createKartState(surface, 100);
    expect(state.speed).toBe(0);
    expect(state.lateral).toBeCloseTo(0, 3);
    expect(deg(state.heading)).toBeCloseTo(0, 0); // 서쪽 직선 중간은 +Z 방향
    expect(state.boosters).toBe(0);
  });
});

describe('stepKart 기본 주행', () => {
  it('엑셀 1로 4초면 최고 속도 30m/s에 도달하고 넘지 않는다', () => {
    const surface = stadiumSurface();
    const start = createKartState(surface, 100);
    expect(run(surface, start, { ...NO_INPUT, throttle: 1 }, 240).speed).toBeCloseTo(30, 0);
    expect(run(surface, start, { ...NO_INPUT, throttle: 1 }, 600).speed).toBeLessThanOrEqual(30);
  });

  it('엑셀 0.5면 최고 속도의 절반까지만 오른다', () => {
    const surface = stadiumSurface();
    expect(run(surface, createKartState(surface, 100), { ...NO_INPUT, throttle: 0.5 }, 300).speed).toBeCloseTo(15, 1);
  });

  it('엑셀을 떼면 초당 5m/s씩 감속하고 0 아래로 내려가지 않는다', () => {
    const surface = stadiumSurface();
    const moving = { ...createKartState(surface, 100), speed: 20 };
    expect(run(surface, moving, NO_INPUT, 60).speed).toBeCloseTo(15, 1);
    expect(run(surface, moving, NO_INPUT, 360).speed).toBe(0);
  });

  it('속도 20에서 steer -1을 1초 유지하면 왼쪽(heading +)으로 약 90° 돈다', () => {
    const surface = openSurface();
    const moving = { ...createKartState(surface, 100), speed: 20 };
    const after = run(surface, moving, { ...hold(20), steer: -1 }, 60);
    expect(deg(after.heading - moving.heading)).toBeGreaterThan(88);
    expect(deg(after.heading - moving.heading)).toBeLessThan(92);
  });

  it('steer 1은 오른쪽(heading -)으로 돈다', () => {
    const surface = openSurface();
    const moving = { ...createKartState(surface, 100), speed: 20 };
    expect(run(surface, moving, { ...hold(20), steer: 1 }, 30).heading).toBeLessThan(moving.heading);
  });

  it('정지 상태에서는 조향해도 heading이 거의 바뀌지 않는다', () => {
    const surface = openSurface();
    const start = createKartState(surface, 100);
    expect(Math.abs(deg(run(surface, start, { ...NO_INPUT, steer: -1 }, 60).heading - start.heading))).toBeLessThan(1);
  });

  it('경사 구간에서 position.y는 노면 높이를 따른다', () => {
    const surface = hillSurface();
    const after = run(surface, { ...createKartState(surface, 100), speed: 20 }, hold(20), 900);
    const q = surface.query(after.position, after.s);
    expect(after.position.y).toBeGreaterThan(5);
    expect(after.position.y).toBeCloseTo(q.groundY, 2);
  });
});

describe('stepKart 벽', () => {
  // 서쪽 직선에서 왼쪽 벽(lateral -) 쪽으로 60° 틀어 속도 20으로 달린다
  function towardWall() {
    const surface = stadiumSurface();
    const start = createKartState(surface, 100);
    return { surface, state: { ...start, heading: start.heading + Math.PI / 3, speed: 20 } };
  }

  it('벽에 부딪히면 속도가 절반이 되고 도로 안에 머문다', () => {
    const { surface, state } = towardWall();
    let s = state;
    let ticks = 0;
    while (!s.touchingWall && ticks < 120) {
      s = stepKart(s, hold(20), surface, DEFAULT_KART_CONFIG, TICK_DT);
      ticks++;
    }
    expect(s.touchingWall).toBe(true);
    expect(s.speed).toBeCloseTo(10, 0);
    expect(Math.abs(s.lateral)).toBeLessThanOrEqual(5 - DEFAULT_KART_CONFIG.kartHalfWidth + 1e-6);
  });

  it('벽에 붙어 있는 동안에는 속도가 반복해서 깎이지 않는다', () => {
    const { surface, state } = towardWall();
    let s = state;
    let halvings = 0;
    for (let i = 0; i < 120; i++) {
      const next = stepKart(s, { ...hold(20), steer: -1 }, surface, DEFAULT_KART_CONFIG, TICK_DT);
      if (next.speed < s.speed * 0.7) halvings++;
      s = next;
    }
    expect(halvings).toBe(1);
    expect(Math.abs(s.lateral)).toBeLessThanOrEqual(5 - DEFAULT_KART_CONFIG.kartHalfWidth + 1e-6);
  });
});

describe('stepKart 결정성', () => {
  it('같은 입력 순서면 결과가 완전히 같다', () => {
    let seed = 42;
    const random = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };
    const inputs: ControlInput[] = Array.from({ length: 600 }, () => ({
      steer: random() * 2 - 1,
      throttle: random(),
      drift: random() > 0.8,
      boost: random() > 0.98,
    }));
    const play = () => {
      const surface = stadiumSurface();
      let s = createKartState(surface, 100);
      for (const input of inputs) s = stepKart(s, input, surface, DEFAULT_KART_CONFIG, TICK_DT);
      return s;
    };
    expect(play()).toEqual(play());
  });

  it('입력 state를 바꾸지 않는다', () => {
    const surface = stadiumSurface();
    const start = createKartState(surface, 100);
    const copy = structuredClone(start);
    stepKart(start, { ...NO_INPUT, throttle: 1, steer: 1 }, surface, DEFAULT_KART_CONFIG, TICK_DT);
    expect(start).toEqual(copy);
  });
});

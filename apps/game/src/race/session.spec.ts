import { autopilotInput, createRibbonSurface, NO_INPUT, TICK_RATE } from '@winkrider/kart';
import { buildTrack, skyway } from '@winkrider/track';

import { COUNTDOWN_SECONDS, createRaceSession, tickRaceSession, type RaceSession } from './session';

const track = buildTrack(skyway);
const surface = createRibbonSurface(track);
const GO = { ...NO_INPUT, throttle: 1 };
const COUNTDOWN_TICKS = COUNTDOWN_SECONDS * TICK_RATE;

function ticks(session: RaceSession, n: number, faceVisible = true, input = GO): RaceSession {
  let s = session;
  for (let i = 0; i < n; i++) s = tickRaceSession(s, input, faceVisible, track, surface);
  return s;
}

const racing = () => ticks(createRaceSession(track, surface), COUNTDOWN_TICKS);

describe('레이스 세션', () => {
  it('카운트다운 3초 동안 카트는 움직이지 않고 raceTicks는 0', () => {
    const start = createRaceSession(track, surface);
    const s = ticks(start, COUNTDOWN_TICKS - 1);
    expect(s.phase).toBe('countdown');
    expect(s.raceTicks).toBe(0);
    expect(s.kart.position).toEqual(start.kart.position);
  });

  it('카운트다운이 끝나면 racing, 이후 틱마다 raceTicks가 늘어난다', () => {
    let s = racing();
    expect(s.phase).toBe('racing');
    s = ticks(s, 60);
    expect(s.raceTicks).toBe(60);
    expect(s.kart.speed).toBeGreaterThan(0);
  });

  it('racing 중 얼굴을 0.5초 넘게 놓치면 paused, 그동안 raceTicks는 늘지 않는다', () => {
    let s = ticks(racing(), 30, false);
    expect(s.phase).toBe('racing');
    s = ticks(s, 1, false);
    expect(s.phase).toBe('paused');
    const paused = s.raceTicks;
    s = ticks(s, 120, false);
    expect(s.raceTicks).toBe(paused);
    expect(s.kart.position).toEqual(s.prevKart.position);
  });

  it('얼굴이 0.5초 안에 돌아오면 일시정지하지 않는다', () => {
    let s = ticks(racing(), 25, false);
    s = ticks(s, 1, true);
    s = ticks(s, 25, false);
    expect(s.phase).toBe('racing');
  });

  it('paused에서 얼굴이 돌아오면 resuming 3초 뒤 racing', () => {
    let s = ticks(racing(), 31, false);
    s = ticks(s, 1, true);
    expect(s.phase).toBe('resuming');
    // 얼굴이 돌아온 틱에 resuming으로 바뀌고, 거기서부터 3초(180틱)를 센다
    s = ticks(s, COUNTDOWN_TICKS - 1, true);
    expect(s.phase).toBe('resuming');
    s = ticks(s, 1, true);
    expect(s.phase).toBe('racing');
  });

  it('resuming 중에 얼굴을 다시 놓치면 paused로 돌아간다', () => {
    let s = ticks(racing(), 31, false);
    s = ticks(s, 30, true);
    s = ticks(s, 1, false);
    expect(s.phase).toBe('paused');
  });

  it('완주하면 finished이고, lapTicks 길이는 track.definition.laps', () => {
    let s = racing();
    for (let i = 0; i < 20000 && s.phase !== 'finished'; i++) {
      s = tickRaceSession(s, autopilotInput(s.kart, surface), true, track, surface);
    }
    expect(s.phase).toBe('finished');
    expect(s.lapTicks).toHaveLength(skyway.laps);
    expect(s.lapTicks.reduce((a, b) => a + b, 0)).toBe(s.raceTicks);
    const done = ticks(s, 60);
    expect(done.raceTicks).toBe(s.raceTicks);
  });
});

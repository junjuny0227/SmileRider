import { createRibbonSurface } from '@winkrider/kart';
import { buildTrack, skyway } from '@winkrider/track';

import { createRaceSession, type RaceSession } from '../race/session';
import { soundEvents } from './sound-events';

const track = buildTrack(skyway);
const base = createRaceSession(track, createRibbonSurface(track));
const racing: RaceSession = { ...base, phase: 'racing', phaseTime: 5 };
const withKart = (s: RaceSession, kart: Partial<RaceSession['kart']>): RaceSession => ({ ...s, kart: { ...s.kart, ...kart } });

describe('soundEvents', () => {
  it('바뀐 것이 없으면 소리도 없다', () => {
    expect(soundEvents(racing, racing)).toEqual([]);
  });

  it('카운트다운 숫자가 바뀔 때마다 삐 소리, 끝나면 GO', () => {
    const at = (phaseTime: number): RaceSession => ({ ...base, phase: 'countdown', phaseTime });
    expect(soundEvents(at(0.1), at(0.5))).toEqual([]);
    expect(soundEvents(at(0.99), at(1.01))).toEqual(['countdownBeep']);
    expect(soundEvents(at(2.99), { ...base, phase: 'racing', phaseTime: 0 })).toEqual(['countdownGo']);
  });

  it('카운트다운을 시작하는 순간 첫 삐 소리', () => {
    expect(soundEvents(base, { ...base, phaseTime: 1 / 60 })).toEqual(['countdownBeep']);
  });

  it('재개 카운트다운에도 같은 소리', () => {
    const paused: RaceSession = { ...base, phase: 'paused', phaseTime: 3 };
    expect(soundEvents(paused, { ...base, phase: 'resuming', phaseTime: 0 })).toEqual(['countdownBeep']);
  });

  it('부스터를 얻으면, 부스트를 쓰면, 벽에 처음 닿으면', () => {
    expect(soundEvents(racing, withKart(racing, { boosters: 1 }))).toEqual(['boosterGained']);
    expect(soundEvents(withKart(racing, { boosters: 1 }), withKart(racing, { boosters: 0, boostTimeLeft: 1.48 }))).toEqual([
      'boost',
    ]);
    expect(soundEvents(racing, withKart(racing, { touchingWall: true }))).toEqual(['wallHit']);
    const touching = withKart(racing, { touchingWall: true });
    expect(soundEvents(touching, touching)).toEqual([]);
  });

  it('완주하면 finish', () => {
    expect(soundEvents(racing, { ...racing, phase: 'finished' })).toEqual(['finish']);
  });
});

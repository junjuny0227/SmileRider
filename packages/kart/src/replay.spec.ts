import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { buildTrack, skyway } from '@winkrider/track';

import { autopilotInput } from './autopilot.js';
import { DEFAULT_KART_CONFIG, TICK_DT, TICK_RATE } from './config.js';
import { runReplay, type Replay } from './replay.js';
import { createKartState, stepKart } from './step-kart.js';
import { createRibbonSurface } from './surface.js';
import type { ControlInput } from './types.js';

const track = buildTrack(skyway);
const surface = createRibbonSurface(track);
const fixturePath = fileURLToPath(new URL('./fixtures/skyway-autopilot.json', import.meta.url));
const MAX_TICKS = 4 * 60 * TICK_RATE;

// 자동 주행으로 MAX_TICKS만큼 입력을 만든다
function recordAutopilot(): ControlInput[] {
  const inputs: ControlInput[] = [];
  let state = createKartState(surface);
  for (let i = 0; i < MAX_TICKS; i++) {
    const input = autopilotInput(state, surface);
    inputs.push(input);
    state = stepKart(state, input, surface, DEFAULT_KART_CONFIG, TICK_DT);
  }
  return inputs;
}

describe('자동 주행과 입력 재생', () => {
  it.runIf(process.env['RECORD_REPLAY'] === '1')('기준 데이터 생성', () => {
    const all = recordAutopilot();
    const finishTick = runReplay(surface, track, all).finishTick ?? all.length;
    const replay: Replay = { trackId: skyway.id, tickRate: TICK_RATE, inputs: all.slice(0, finishTick), finishTick };
    writeFileSync(fixturePath, JSON.stringify(replay) + '\n');
  });

  it('자동 주행은 스카이웨이 2랩을 완주하고, 한 바퀴는 45~75초', () => {
    const result = runReplay(surface, track, recordAutopilot());
    expect(result.finishTick).not.toBeNull();
    expect(result.lapTicks).toHaveLength(2);
    for (const ticks of result.lapTicks) {
      expect(ticks).toBeGreaterThanOrEqual(45 * TICK_RATE);
      expect(ticks).toBeLessThanOrEqual(75 * TICK_RATE);
    }
  });

  it('기준 데이터를 재생하면 기록된 완주 틱과 정확히 같다', () => {
    const replay = JSON.parse(readFileSync(fixturePath, 'utf8')) as Replay;
    expect(replay.trackId).toBe(skyway.id);
    expect(replay.tickRate).toBe(TICK_RATE);
    expect(runReplay(surface, track, replay.inputs).finishTick).toBe(replay.finishTick);
  });

  it('입력이 완주 전에 끝나면 finishTick은 null', () => {
    const result = runReplay(surface, track, [{ steer: 0, throttle: 1, drift: false, boost: false }]);
    expect(result.finishTick).toBeNull();
    expect(result.lapTicks).toEqual([]);
  });
});

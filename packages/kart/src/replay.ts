import { createRaceProgress, updateRaceProgress, type Track } from '@smilerider/track';

import { DEFAULT_KART_CONFIG, TICK_DT } from './config.js';
import { createKartState, stepKart } from './step-kart.js';
import type { TrackSurface } from './surface.js';
import type { ControlInput, KartState } from './types.js';

export interface Replay {
  trackId: string;
  tickRate: number;
  inputs: ControlInput[];
  finishTick: number;
}

export interface ReplayResult {
  finishTick: number | null;
  finalState: KartState;
  lapTicks: number[];
}

/** 출발선에서 입력을 한 틱씩 재생한다. 입력이 끝나거나 완주하면 멈춘다 */
export function runReplay(surface: TrackSurface, track: Track, inputs: ControlInput[]): ReplayResult {
  let state = createKartState(surface);
  let progress = createRaceProgress(track);
  const lapTicks: number[] = [];
  let lapStart = 0;
  for (let i = 0; i < inputs.length; i++) {
    state = stepKart(state, inputs[i], surface, DEFAULT_KART_CONFIG, TICK_DT);
    const lapsBefore = progress.completedLaps;
    progress = updateRaceProgress(track, progress, state.s);
    if (progress.completedLaps > lapsBefore) {
      lapTicks.push(i + 1 - lapStart);
      lapStart = i + 1;
    }
    if (progress.finished) return { finishTick: i + 1, finalState: state, lapTicks };
  }
  return { finishTick: null, finalState: state, lapTicks };
}

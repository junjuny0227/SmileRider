import type { Track } from './types.js';

export interface RaceProgress {
  completedLaps: number;
  /** definition.checkpoints의 인덱스. 모두 지나면 checkpoints.length (다음은 출발선) */
  nextCheckpoint: number;
  lastS: number;
  /** 연속으로 거꾸로 간 거리(m) */
  reverseDistance: number;
  wrongWay: boolean;
  finished: boolean;
}

export const WRONG_WAY_DISTANCE = 10;

export function createRaceProgress(_track: Track): RaceProgress {
  return { completedLaps: 0, nextCheckpoint: 0, lastS: 0, reverseDistance: 0, wrongWay: false, finished: false };
}

// from에서 from + delta(> 0)로 앞으로 갈 때 위치 target(0 ~ length)을 지나는가
function passes(from: number, delta: number, target: number, length: number): boolean {
  const to = from + delta;
  return (from < target && target <= to) || (from < target + length && target + length <= to);
}

export function updateRaceProgress(track: Track, progress: RaceProgress, s: number): RaceProgress {
  const length = track.length;
  const { checkpoints, laps } = track.definition;
  let delta = s - progress.lastS;
  if (delta > length / 2) delta -= length;
  if (delta <= -length / 2) delta += length;

  const next = { ...progress, lastS: s };
  if (delta < 0) {
    next.reverseDistance = progress.reverseDistance - delta;
  } else if (delta > 0) {
    next.reverseDistance = 0;
    while (
      next.nextCheckpoint < checkpoints.length &&
      passes(progress.lastS, delta, checkpoints[next.nextCheckpoint] * length, length)
    ) {
      next.nextCheckpoint++;
    }
    if (next.nextCheckpoint === checkpoints.length && passes(progress.lastS, delta, length, length)) {
      next.completedLaps++;
      next.nextCheckpoint = 0;
    }
  }
  next.wrongWay = next.reverseDistance > WRONG_WAY_DISTANCE;
  next.finished = next.completedLaps >= laps;
  return next;
}

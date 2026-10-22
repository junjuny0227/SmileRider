import { DEFAULT_CONTROLS_CONFIG } from '@winkrider/controls';
import {
  createKartState,
  DEFAULT_KART_CONFIG,
  stepKart,
  TICK_DT,
  type ControlInput,
  type KartState,
  type TrackSurface,
} from '@winkrider/kart';
import { createRaceProgress, updateRaceProgress, type RaceProgress, type Track } from '@winkrider/track';

export type InputMode = 'camera' | 'keyboard';
export type RacePhase = 'countdown' | 'racing' | 'paused' | 'resuming' | 'finished';

export interface RaceSession {
  phase: RacePhase;
  /** 현재 단계에 들어온 뒤 지난 시간(s) */
  phaseTime: number;
  /** 기록은 틱 수로 센다 */
  raceTicks: number;
  lapTicks: number[];
  kart: KartState;
  /** 직전 틱의 카트. 화면 보간용 */
  prevKart: KartState;
  progress: RaceProgress;
  faceLostTime: number;
}

export const COUNTDOWN_SECONDS = 3;

// 부동소수점으로 쌓은 시간을 비교할 때의 여유
const EPSILON = 1e-9;

export function createRaceSession(track: Track, surface: TrackSurface): RaceSession {
  const kart = createKartState(surface);
  return {
    phase: 'countdown',
    phaseTime: 0,
    raceTicks: 0,
    lapTicks: [],
    kart,
    prevKart: kart,
    progress: createRaceProgress(track),
    faceLostTime: 0,
  };
}

const enter = (session: RaceSession, phase: RacePhase): RaceSession => ({ ...session, phase, phaseTime: 0 });

/**
 * 주행 로직 한 틱. 카운트다운 3초 뒤부터 기록을 잰다 (기획 10.2).
 * 얼굴을 0.5초 넘게 놓치면 일시정지하고, 돌아오면 3초 카운트다운 후 재개한다 (기획 10.4).
 * 키보드 모드에서는 호출하는 쪽이 faceVisible을 항상 true로 넘긴다.
 */
export function tickRaceSession(
  session: RaceSession,
  input: ControlInput,
  faceVisible: boolean,
  track: Track,
  surface: TrackSurface,
): RaceSession {
  const s = { ...session, prevKart: session.kart };
  switch (s.phase) {
    case 'finished':
      return s;
    case 'countdown':
    case 'resuming': {
      if (s.phase === 'resuming' && !faceVisible) return enter(s, 'paused');
      const phaseTime = s.phaseTime + TICK_DT;
      return phaseTime + EPSILON >= COUNTDOWN_SECONDS ? enter(s, 'racing') : { ...s, phaseTime };
    }
    case 'paused':
      return faceVisible ? { ...enter(s, 'resuming'), faceLostTime: 0 } : { ...s, phaseTime: s.phaseTime + TICK_DT };
    case 'racing': {
      const faceLostTime = faceVisible ? 0 : s.faceLostTime + TICK_DT;
      if (faceLostTime > DEFAULT_CONTROLS_CONFIG.faceLostPauseSeconds + EPSILON) {
        return { ...enter(s, 'paused'), faceLostTime };
      }
      const kart = stepKart(s.kart, input, surface, DEFAULT_KART_CONFIG, TICK_DT);
      const progress = updateRaceProgress(track, s.progress, kart.s);
      const raceTicks = s.raceTicks + 1;
      const lapTicks =
        progress.completedLaps > s.progress.completedLaps
          ? [...s.lapTicks, raceTicks - s.lapTicks.reduce((a, b) => a + b, 0)]
          : s.lapTicks;
      const next = { ...s, kart, progress, raceTicks, lapTicks, faceLostTime, phaseTime: s.phaseTime + TICK_DT };
      return progress.finished ? enter(next, 'finished') : next;
    }
  }
}

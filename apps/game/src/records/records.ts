import type { InputMode } from '../race/session';

export interface BestRecord {
  bestTotalMs: number;
  bestLapMs: number;
}

export interface SaveOutcome {
  isBestTotal: boolean;
  isBestLap: boolean;
}

type RecordsData = Record<string, Partial<Record<InputMode, BestRecord>>>;

const KEY = 'winkrider:records:v1';

// 사생활 보호 모드 등에서는 localStorage에 접근하는 것만으로 예외가 날 수 있다
function defaultStorage(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

function readAll(storage: Storage): RecordsData {
  const raw = storage.getItem(KEY);
  if (!raw) return {};
  const parsed: unknown = JSON.parse(raw);
  return parsed && typeof parsed === 'object' ? (parsed as RecordsData) : {};
}

const isRecord = (value: unknown): value is BestRecord =>
  !!value &&
  typeof (value as BestRecord).bestTotalMs === 'number' &&
  typeof (value as BestRecord).bestLapMs === 'number';

/** 트랙별, 조작 방식별 최고 기록. 저장소를 쓸 수 없거나 값이 깨져 있으면 null */
export function loadRecord(trackId: string, mode: InputMode, storage = defaultStorage()): BestRecord | null {
  if (!storage) return null;
  try {
    const record = readAll(storage)[trackId]?.[mode];
    return isRecord(record) ? record : null;
  } catch {
    return null;
  }
}

/** 기록을 저장하고 최고 기록인지 알려 준다. 저장할 수 없으면 둘 다 false */
export function saveResult(
  trackId: string,
  mode: InputMode,
  totalMs: number,
  lapMs: number[],
  storage = defaultStorage(),
): SaveOutcome {
  if (!storage) return { isBestTotal: false, isBestLap: false };
  try {
    const all = readAll(storage);
    const stored = all[trackId]?.[mode];
    const previous = isRecord(stored) ? stored : null;
    const lap = Math.min(...lapMs);
    const isBestTotal = !previous || totalMs < previous.bestTotalMs;
    const isBestLap = !previous || lap < previous.bestLapMs;
    all[trackId] = {
      ...all[trackId],
      [mode]: {
        bestTotalMs: previous ? Math.min(previous.bestTotalMs, totalMs) : totalMs,
        bestLapMs: previous ? Math.min(previous.bestLapMs, lap) : lap,
      },
    };
    storage.setItem(KEY, JSON.stringify(all));
    return { isBestTotal, isBestLap };
  } catch {
    return { isBestTotal: false, isBestLap: false };
  }
}

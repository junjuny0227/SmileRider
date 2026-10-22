export interface AudioSettings {
  muted: boolean;
  /** 0 ~ 1 */
  volume: number;
}

export const DEFAULT_AUDIO_SETTINGS: AudioSettings = { muted: false, volume: 0.8 };

const KEY = 'smilerider:audio:v1';

function defaultStorage(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

/** 음소거와 음량. 저장소를 쓸 수 없거나 값이 깨져 있으면 기본값 */
export function loadAudioSettings(storage = defaultStorage()): AudioSettings {
  try {
    const raw = storage?.getItem(KEY);
    if (!raw) return { ...DEFAULT_AUDIO_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<AudioSettings>;
    if (typeof parsed.muted !== 'boolean' || typeof parsed.volume !== 'number') return { ...DEFAULT_AUDIO_SETTINGS };
    return { muted: parsed.muted, volume: Math.min(1, Math.max(0, parsed.volume)) };
  } catch {
    return { ...DEFAULT_AUDIO_SETTINGS };
  }
}

export function saveAudioSettings(settings: AudioSettings, storage = defaultStorage()): void {
  try {
    storage?.setItem(KEY, JSON.stringify(settings));
  } catch {
    // 저장하지 못해도 이번 접속 동안은 설정이 유지된다
  }
}

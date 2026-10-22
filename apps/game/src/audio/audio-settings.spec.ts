import { loadAudioSettings, saveAudioSettings } from './audio-settings';

class MemoryStorage {
  data = new Map<string, string>();
  getItem(key: string) {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.data.set(key, value);
  }
}

const broken = {
  getItem(): string | null {
    throw new DOMException('denied', 'SecurityError');
  },
  setItem(): void {
    throw new DOMException('full', 'QuotaExceededError');
  },
};

describe('소리 설정', () => {
  it('저장된 값이 없으면 기본값 { muted: false, volume: 0.8 }', () => {
    expect(loadAudioSettings(new MemoryStorage() as unknown as Storage)).toEqual({ muted: false, volume: 0.8 });
  });

  it('저장한 값을 다시 읽는다 (새로고침 후에도 음소거 유지)', () => {
    const storage = new MemoryStorage() as unknown as Storage;
    saveAudioSettings({ muted: true, volume: 0.4 }, storage);
    expect(loadAudioSettings(storage)).toEqual({ muted: true, volume: 0.4 });
  });

  it('저장소가 예외를 던지면 기본값이고, 저장도 throw하지 않는다', () => {
    expect(loadAudioSettings(broken as unknown as Storage)).toEqual({ muted: false, volume: 0.8 });
    expect(() => saveAudioSettings({ muted: true, volume: 0.5 }, broken as unknown as Storage)).not.toThrow();
  });

  it('깨진 값은 기본값으로, 음량은 0~1로 자른다', () => {
    const storage = new MemoryStorage();
    storage.setItem('smilerider:audio:v1', '{oops');
    expect(loadAudioSettings(storage as unknown as Storage)).toEqual({ muted: false, volume: 0.8 });
    storage.setItem('smilerider:audio:v1', JSON.stringify({ muted: false, volume: 3 }));
    expect(loadAudioSettings(storage as unknown as Storage).volume).toBe(1);
  });
});

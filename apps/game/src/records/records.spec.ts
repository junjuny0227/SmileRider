import { loadRecord, saveResult } from './records';

class MemoryStorage implements Storage {
  private data = new Map<string, string>();
  get length() {
    return this.data.size;
  }
  clear() {
    this.data.clear();
  }
  getItem(key: string) {
    return this.data.get(key) ?? null;
  }
  key(index: number) {
    return [...this.data.keys()][index] ?? null;
  }
  removeItem(key: string) {
    this.data.delete(key);
  }
  setItem(key: string, value: string) {
    this.data.set(key, value);
  }
}

class BrokenStorage extends MemoryStorage {
  override getItem(): string | null {
    throw new DOMException('denied', 'SecurityError');
  }
  override setItem(): void {
    throw new DOMException('full', 'QuotaExceededError');
  }
}

describe('기록 저장', () => {
  it('처음 저장하면 isBestTotal, isBestLap 모두 true', () => {
    const storage = new MemoryStorage();
    expect(saveResult('skyway', 'camera', 120000, [61000, 59000], storage)).toEqual({ isBestTotal: true, isBestLap: true });
    expect(loadRecord('skyway', 'camera', storage)).toEqual({ bestTotalMs: 120000, bestLapMs: 59000 });
  });

  it('더 느린 기록은 최고 기록을 덮어쓰지 않는다', () => {
    const storage = new MemoryStorage();
    saveResult('skyway', 'camera', 120000, [61000, 59000], storage);
    expect(saveResult('skyway', 'camera', 125000, [58000, 67000], storage)).toEqual({ isBestTotal: false, isBestLap: true });
    expect(loadRecord('skyway', 'camera', storage)).toEqual({ bestTotalMs: 120000, bestLapMs: 58000 });
  });

  it('camera와 keyboard 기록은 따로 저장된다', () => {
    const storage = new MemoryStorage();
    saveResult('skyway', 'keyboard', 90000, [45000, 45000], storage);
    expect(loadRecord('skyway', 'camera', storage)).toBeNull();
    expect(saveResult('skyway', 'camera', 120000, [60000, 60000], storage).isBestTotal).toBe(true);
    expect(loadRecord('skyway', 'keyboard', storage)?.bestTotalMs).toBe(90000);
  });

  it('storage.getItem/setItem이 예외를 던져도 throw하지 않는다', () => {
    const storage = new BrokenStorage();
    expect(loadRecord('skyway', 'camera', storage)).toBeNull();
    expect(saveResult('skyway', 'camera', 120000, [60000, 60000], storage)).toEqual({ isBestTotal: false, isBestLap: false });
  });

  it('저장된 JSON이 깨져 있어도 null을 돌려준다', () => {
    const storage = new MemoryStorage();
    storage.setItem('smilerider:records:v1', '{not json');
    expect(loadRecord('skyway', 'camera', storage)).toBeNull();
    storage.setItem('smilerider:records:v1', JSON.stringify({ skyway: { camera: { bestTotalMs: 'fast' } } }));
    expect(loadRecord('skyway', 'camera', storage)).toBeNull();
  });
});

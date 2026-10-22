import type { ControlInput } from '@winkrider/kart';

export interface KeyTracker {
  /** KeyboardEvent.key 값 */
  down(key: string): void;
  up(key: string): void;
  /** 창이 포커스를 잃으면 모든 키를 뗀 것으로 본다 */
  blur(): void;
  read(): ControlInput;
}

/** ← → 조향, ↑ 엑셀, Shift 드리프트, Ctrl 부스트 (기획 10.5). 브레이크와 후진은 없다 */
export function createKeyTracker(): KeyTracker {
  const pressed = new Set<string>();
  let boostPending = false;
  return {
    down(key) {
      if (key === 'Control' && !pressed.has(key)) boostPending = true;
      pressed.add(key);
    },
    up(key) {
      pressed.delete(key);
    },
    blur() {
      pressed.clear();
      boostPending = false;
    },
    read() {
      const boost = boostPending;
      boostPending = false;
      return {
        steer: (pressed.has('ArrowRight') ? 1 : 0) - (pressed.has('ArrowLeft') ? 1 : 0),
        throttle: pressed.has('ArrowUp') ? 1 : 0,
        drift: pressed.has('Shift'),
        boost,
      };
    },
  };
}

import type { VisionFrame } from '@smilerider/controls';

import type { FromWorker } from './protocol';

/**
 * Worker가 이전 프레임을 처리하는 동안에는 새 프레임을 보내지 않는다 (기획 8.1).
 * 결과뿐 아니라 오류가 와도 다시 보낼 수 있게 풀어 줘야, 예외 한 번에 인식이 영원히 멈추지 않는다.
 */
export function createFrameGate(onFrame: (frame: VisionFrame) => void) {
  let busy = false;
  return {
    /** 보낼 수 있으면 true를 돌려주고 처리 중 상태로 바꾼다 */
    tryStart(): boolean {
      if (busy) return false;
      busy = true;
      return true;
    },
    handle(message: FromWorker): void {
      if (message.type === 'result') {
        busy = false;
        onFrame(message.frame);
      } else if (message.type === 'frame-error') {
        busy = false;
      }
    },
    /** Worker 자체 오류나 프레임 캡처 실패처럼 응답이 오지 않을 때 */
    release(): void {
      busy = false;
    },
  };
}

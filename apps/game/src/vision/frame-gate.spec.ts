import type { VisionFrame } from '@winkrider/controls';

import { createFrameGate } from './frame-gate';

const frame: VisionFrame = { timestamp: 1, face: null, hand: null, handEvaluated: true };

describe('createFrameGate', () => {
  it('처리 중이면 새 프레임을 보내지 않는다', () => {
    const gate = createFrameGate(() => undefined);
    expect(gate.tryStart()).toBe(true);
    expect(gate.tryStart()).toBe(false);
  });

  it('결과가 오면 다시 보낼 수 있고 결과를 넘긴다', () => {
    const received: VisionFrame[] = [];
    const gate = createFrameGate((f) => received.push(f));
    gate.tryStart();
    gate.handle({ type: 'result', frame });
    expect(received).toEqual([frame]);
    expect(gate.tryStart()).toBe(true);
  });

  it('Worker가 프레임 처리 중 오류를 보내도 멈추지 않고 다시 보낼 수 있다', () => {
    const gate = createFrameGate(() => undefined);
    gate.tryStart();
    gate.handle({ type: 'frame-error', message: 'GPU context lost' });
    expect(gate.tryStart()).toBe(true);
  });

  it('Worker 자체 오류(onerror)나 프레임 캡처 실패 뒤에도 다시 보낼 수 있다', () => {
    const gate = createFrameGate(() => undefined);
    gate.tryStart();
    gate.release();
    expect(gate.tryStart()).toBe(true);
  });
});

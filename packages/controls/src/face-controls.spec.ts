import type { ControlInput } from '@smilerider/kart';

import { DEFAULT_CONTROLS_CONFIG } from './config.js';
import { createFaceControlsState, updateFaceControls, type FaceControlsState } from './face-controls.js';
import type { Calibration, VisionFrame } from './types.js';

// 평소 0, 최대 1로 보정된 상태. 원값이 곧 보정값이다
const cal: Calibration = {
  neutral: { jawOpen: 0, mouthSmile: 0 },
  max: { jawOpen: 1, mouthSmile: 1 },
  neutralRollDeg: 0,
  tiltSign: 1,
};

const frame = ({ jaw = 0, smile = 0, roll = 0 }: { jaw?: number; smile?: number; roll?: number }): VisionFrame => ({
  timestamp: 0,
  face: { blendshapes: { jawOpen: jaw, mouthSmile: smile }, headRollDeg: roll },
});
const lost = (): VisionFrame => ({ timestamp: 0, face: null });

function feed(frames: VisionFrame[], calibration = cal, start = createFaceControlsState()) {
  let state: FaceControlsState = start;
  const inputs: ControlInput[] = [];
  for (const f of frames) {
    const result = updateFaceControls(state, f, calibration, DEFAULT_CONTROLS_CONFIG);
    state = result.state;
    inputs.push(result.input);
  }
  return { state, inputs, last: inputs[inputs.length - 1] };
}

const settle = (f: VisionFrame, calibration = cal) => feed(Array(20).fill(f), calibration).last;

describe('updateFaceControls 조향', () => {
  it('5° 미만 0, 15°는 0.5, 25° 이상 최대, 부호는 tiltSign을 따른다', () => {
    expect(settle(frame({ roll: 3 })).steer).toBe(0);
    expect(settle(frame({ roll: 15 })).steer).toBeCloseTo(0.5, 2);
    expect(settle(frame({ roll: 30 })).steer).toBeGreaterThan(0.99);
    expect(settle(frame({ roll: -30 })).steer).toBeLessThan(-0.99);
    expect(settle(frame({ roll: 30 }), { ...cal, tiltSign: -1 }).steer).toBeLessThan(-0.99);
  });

  it('평소 각도를 0으로 본다: 평소 8°인 사람이 8°면 0, 23°면 0.5', () => {
    const tilted = { ...cal, neutralRollDeg: 8 };
    expect(settle(frame({ roll: 8 }), tilted).steer).toBe(0);
    expect(settle(frame({ roll: 23 }), tilted).steer).toBeCloseTo(0.5, 2);
  });

  it('스무딩: 목표가 1일 때 첫 프레임 값은 0.3', () => {
    expect(feed([frame({ roll: 30 })]).last.steer).toBeCloseTo(0.3, 6);
  });
});

describe('updateFaceControls 엑셀', () => {
  it('얼굴이 보이면 항상 1', () => {
    expect(feed([frame({})]).last.throttle).toBe(1);
    expect(feed([frame({ jaw: 0.9 })]).last.throttle).toBe(1);
  });
});

describe('updateFaceControls 드리프트', () => {
  it('입 벌림 0.4 이상이 연속 2프레임이어야 시작, 0.4 미만이면 바로 끝', () => {
    expect(feed([frame({ jaw: 0.5 })]).last.drift).toBe(false);
    expect(feed([frame({ jaw: 0.5 }), frame({ jaw: 0.5 })]).last.drift).toBe(true);
    expect(feed([frame({ jaw: 0.5 }), frame({ jaw: 0.5 }), frame({ jaw: 0.3 })]).last.drift).toBe(false);
    expect(feed([frame({ jaw: 0.39 }), frame({ jaw: 0.39 })]).last.drift).toBe(false);
  });
});

describe('updateFaceControls 부스트', () => {
  it('웃음 0.6 이상이 연속 2프레임이면 한 번만 나가고, 0.45 미만으로 내려가야 다시 나간다', () => {
    const { inputs } = feed([0.9, 0.9, 0.9, 0.5, 0.9, 0.3, 0.9, 0.9].map((smile) => frame({ smile })));
    expect(inputs.map((i) => i.boost)).toEqual([false, true, false, false, false, false, false, true]);
  });

  it('크게 웃어 입이 0.4 이상 벌어지면 드리프트만 나가고 부스트는 안 나간다', () => {
    const { inputs } = feed(Array(5).fill(frame({ jaw: 0.5, smile: 0.9 })));
    expect(inputs.some((i) => i.boost)).toBe(false);
    expect(inputs[4].drift).toBe(true);
  });

  it('"아!"에서 입을 다물며 웃으면 2프레임째에 부스트', () => {
    const { inputs } = feed([
      ...Array(3).fill(frame({ jaw: 0.6 })),
      frame({ jaw: 0.1, smile: 0.9 }),
      frame({ jaw: 0.1, smile: 0.9 }),
    ]);
    expect(inputs.map((i) => i.boost)).toEqual([false, false, false, false, true]);
  });

  it('웃는 중에 얼굴을 놓쳤다가 웃는 채로 돌아와도 부스트가 다시 나가지 않는다', () => {
    const { inputs } = feed([
      frame({ smile: 0.9 }),
      frame({ smile: 0.9 }),
      lost(),
      frame({ smile: 0.9 }),
      frame({ smile: 0.9 }),
    ]);
    expect(inputs.map((i) => i.boost)).toEqual([false, true, false, false, false]);
  });
});

describe('updateFaceControls 보정 적용', () => {
  it('평소 0.04, 최대 0.79인 입: 원값 0.35는 드리프트(보정값 0.41), 0.3은 아님(0.35)', () => {
    const real = { ...cal, neutral: { jawOpen: 0.04, mouthSmile: 0 }, max: { jawOpen: 0.79, mouthSmile: 0.78 } };
    expect(feed([frame({ jaw: 0.35 }), frame({ jaw: 0.35 })], real).last.drift).toBe(true);
    expect(feed([frame({ jaw: 0.3 }), frame({ jaw: 0.3 })], real).last.drift).toBe(false);
  });
});

describe('updateFaceControls 얼굴을 놓쳤을 때', () => {
  it('입력 없음', () => {
    const { state } = feed(Array(5).fill(frame({ roll: 30, jaw: 0.9 })));
    expect(feed([lost()], cal, state).last).toEqual({ steer: 0, throttle: 0, drift: false, boost: false });
  });
});

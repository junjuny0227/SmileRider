import type { ControlInput } from '@smilerider/kart';

import { DEFAULT_CONTROLS_CONFIG } from './config.js';
import {
  createFaceControlsState,
  updateFaceControls,
  type FaceControlsState,
  type SteeringMode,
} from './face-controls.js';
import type { Calibration, HandFrame, VisionFrame } from './types.js';

// 평소 0.3, 최대 0.8로 보정된 상태. 보정값 = (raw - 0.3) / 0.5
const calibration: Calibration = {
  neutral: { eyeBlinkLeft: 0.3, eyeBlinkRight: 0.3, jawOpen: 0.3 },
  max: { eyeBlinkLeft: 0.8, eyeBlinkRight: 0.8, jawOpen: 0.8 },
  swapEyes: false,
};

const frame = (left: number, right: number, jaw = 0.3, hand: HandFrame | null = null, roll = 0): VisionFrame => ({
  timestamp: 0,
  face: { blendshapes: { eyeBlinkLeft: left, eyeBlinkRight: right, jawOpen: jaw }, headRollDeg: roll },
  hand,
  handEvaluated: true,
});

interface Options {
  calibration?: Calibration;
  mode?: SteeringMode;
  tiltSign?: 1 | -1;
}

function feed(frames: VisionFrame[], options: Options = {}, start = createFaceControlsState()) {
  let state: FaceControlsState = start;
  const inputs: ControlInput[] = [];
  for (const f of frames) {
    const result = updateFaceControls(
      state,
      f,
      options.calibration ?? calibration,
      options.mode ?? 'wink',
      options.tiltSign ?? 1,
      DEFAULT_CONTROLS_CONFIG,
    );
    state = result.state;
    inputs.push(result.input);
  }
  return { state, inputs, last: inputs[inputs.length - 1] };
}

const settle = (f: VisionFrame, options?: Options) => feed(Array(20).fill(f), options).last;

describe('updateFaceControls 조향', () => {
  it('왼쪽 윙크는 왼쪽 조향(steer < 0)', () => {
    expect(settle(frame(0.8, 0.3)).steer).toBeLessThan(-0.95);
  });

  it('오른쪽 윙크는 오른쪽 조향(steer > 0)', () => {
    expect(settle(frame(0.3, 0.8)).steer).toBeGreaterThan(0.95);
  });

  it('swapEyes가 true면 방향이 바뀐다', () => {
    expect(settle(frame(0.8, 0.3), { calibration: { ...calibration, swapEyes: true } }).steer).toBeGreaterThan(0.95);
  });

  it('두 눈 차이가 데드존 0.15 미만이면 조향 0', () => {
    expect(settle(frame(0.35, 0.3)).steer).toBe(0);
  });

  it('두 눈 모두 보정값 0.5 이상이면(깜빡임) 조향 0', () => {
    expect(settle(frame(0.8, 0.6)).steer).toBe(0);
  });

  it('스무딩: 조향 목표가 1일 때 첫 프레임 값은 0.3', () => {
    expect(feed([frame(0.3, 0.8)]).last.steer).toBeCloseTo(0.3, 6);
  });

  it('headTilt 모드: 5° 미만 0, 25° 이상 최대, 15°는 0.5', () => {
    const tilt = (roll: number, tiltSign: 1 | -1 = 1) =>
      settle(frame(0.3, 0.3, 0.3, null, roll), { mode: 'headTilt', tiltSign }).steer;
    expect(tilt(3)).toBe(0);
    expect(tilt(30)).toBeGreaterThan(0.99);
    expect(tilt(15)).toBeCloseTo(0.5, 2);
    expect(tilt(-30)).toBeLessThan(-0.99);
    expect(tilt(30, -1)).toBeLessThan(-0.99);
  });

  it('headTilt 모드에서는 윙크를 무시한다', () => {
    expect(settle(frame(0.8, 0.3), { mode: 'headTilt' }).steer).toBe(0);
  });
});

describe('updateFaceControls 엑셀', () => {
  it('jawOpen 보정값 0.1 미만은 0, 0.8 이상은 1, 0.45는 0.5', () => {
    expect(settle(frame(0.3, 0.3, 0.34)).throttle).toBe(0);
    expect(settle(frame(0.3, 0.3, 0.7)).throttle).toBeGreaterThan(0.99);
    expect(settle(frame(0.3, 0.3, 0.525)).throttle).toBeCloseTo(0.5, 2);
  });
});

describe('updateFaceControls 얼굴을 놓쳤을 때', () => {
  it('조향·엑셀 0, 드리프트·부스트 false', () => {
    const fist: HandFrame = { gesture: 'Closed_Fist', score: 0.9 };
    const { state } = feed(Array(20).fill(frame(0.8, 0.3, 0.8, fist)));
    const lost: VisionFrame = { timestamp: 0, face: null, hand: fist, handEvaluated: true };
    const { last } = feed([lost], {}, state);
    expect(last).toEqual({ steer: 0, throttle: 0, drift: false, boost: false });
  });
});

describe('updateFaceControls 손동작', () => {
  const fist: HandFrame = { gesture: 'Closed_Fist', score: 0.7 };
  const thumb: HandFrame = { gesture: 'Thumb_Up', score: 0.9 };
  const none: HandFrame = { gesture: 'None', score: 0.9 };
  const withHand = (hand: HandFrame | null) => frame(0.3, 0.3, 0.3, hand);

  it('주먹은 점수 0.6 이상이 연속 2번이어야 드리프트', () => {
    expect(feed([withHand(fist)]).last.drift).toBe(false);
    expect(feed([withHand(fist), withHand(fist)]).last.drift).toBe(true);
    expect(feed([withHand({ ...fist, score: 0.5 }), withHand({ ...fist, score: 0.5 })]).last.drift).toBe(false);
  });

  it('주먹을 풀면 드리프트가 끝난다', () => {
    expect(feed([withHand(fist), withHand(fist), withHand(none)]).last.drift).toBe(false);
  });

  it('엄지 척은 인정되는 순간 한 번만 boost, 풀었다가 다시 해야 또 나간다', () => {
    const { inputs } = feed([
      withHand(thumb),
      withHand(thumb),
      withHand(thumb),
      withHand(null),
      withHand(thumb),
      withHand(thumb),
    ]);
    expect(inputs.map((i) => i.boost)).toEqual([false, true, false, false, false, true]);
  });

  it('handEvaluated가 false인 프레임은 손 상태를 바꾸지 않는다', () => {
    const skipped: VisionFrame = { ...withHand(null), handEvaluated: false };
    expect(feed([withHand(fist), withHand(fist), skipped]).last.drift).toBe(true);
    expect(feed([withHand(fist), skipped, withHand(fist)]).last.drift).toBe(true);
  });
});

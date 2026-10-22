import { DEFAULT_CONTROLS_CONFIG, type Calibration, type HandFrame, type VisionFrame } from '@winkrider/controls';

import { createCameraInput } from './camera-input';

const calibration: Calibration = {
  neutral: { eyeBlinkLeft: 0.3, eyeBlinkRight: 0.3, jawOpen: 0.3 },
  max: { eyeBlinkLeft: 0.8, eyeBlinkRight: 0.8, jawOpen: 0.8 },
  swapEyes: false,
};

const frame = (timestamp: number, hand: HandFrame | null = null, face = true): VisionFrame => ({
  timestamp,
  face: face ? { blendshapes: { eyeBlinkLeft: 0.3, eyeBlinkRight: 0.3, jawOpen: 0.8 }, headRollDeg: 0 } : null,
  hand,
  handEvaluated: true,
});

const make = () => createCameraInput(calibration, 'wink', 1, DEFAULT_CONTROLS_CONFIG);
const thumb: HandFrame = { gesture: 'Thumb_Up', score: 0.9 };

describe('createCameraInput', () => {
  it('인식 결과가 오기 전에는 입력 없음', () => {
    expect(make().read()).toEqual({ steer: 0, throttle: 0, drift: false, boost: false });
  });

  it('마지막 인식 결과의 조작 입력을 돌려준다', () => {
    const input = make();
    input.push(frame(0));
    expect(input.read().throttle).toBeGreaterThan(0);
  });

  it('부스트는 인식 결과 하나당 한 번만 전달한다 (주행 틱이 인식보다 잦음)', () => {
    const input = make();
    input.push(frame(0, thumb));
    input.push(frame(33, thumb));
    expect(input.read().boost).toBe(true);
    expect(input.read().boost).toBe(false);
    expect(input.read().boost).toBe(false);
  });

  it('얼굴이 보이는지는 마지막 결과와 그 시각으로 판단한다', () => {
    const input = make();
    expect(input.isFaceVisible(0)).toBe(false);
    input.push(frame(1000));
    expect(input.isFaceVisible(1100)).toBe(true);
    expect(input.isFaceVisible(1400)).toBe(false); // 인식이 300ms 넘게 멈추면 안 보이는 것으로 본다
    input.push(frame(1500, null, false));
    expect(input.isFaceVisible(1510)).toBe(false);
  });
});

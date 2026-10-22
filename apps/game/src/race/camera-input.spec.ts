import { DEFAULT_CONTROLS_CONFIG, type Calibration, type VisionFrame } from '@smilerider/controls';

import { createCameraInput } from './camera-input';

// 평소 0, 최대 1로 보정된 상태. 원값이 곧 보정값이다
const calibration: Calibration = {
  neutral: { jawOpen: 0, mouthSmile: 0 },
  max: { jawOpen: 1, mouthSmile: 1 },
  neutralRollDeg: 0,
  tiltSign: 1,
};

const frame = (timestamp: number, smile = 0, face = true): VisionFrame => ({
  timestamp,
  face: face ? { blendshapes: { jawOpen: 0, mouthSmile: smile }, headRollDeg: 0 } : null,
});

const make = () => createCameraInput(calibration, DEFAULT_CONTROLS_CONFIG);
const SMILE = 0.9;

describe('createCameraInput', () => {
  it('인식 결과가 오기 전에는 입력 없음', () => {
    expect(make().read(0)).toEqual({ steer: 0, throttle: 0, drift: false, boost: false });
  });

  it('마지막 인식 결과의 조작 입력을 돌려준다', () => {
    const input = make();
    input.push(frame(0));
    expect(input.read(16).throttle).toBeGreaterThan(0);
  });

  it('부스트는 인식 결과 하나당 한 번만 전달한다 (주행 틱이 인식보다 잦음)', () => {
    const input = make();
    input.push(frame(0, SMILE));
    input.push(frame(33, SMILE));
    expect(input.read(40).boost).toBe(true);
    expect(input.read(56).boost).toBe(false);
    expect(input.read(72).boost).toBe(false);
  });

  it('인식 결과가 300ms 넘게 끊기면 마지막 조작을 유지하지 않고 입력 없음을 돌려준다', () => {
    const input = make();
    input.push(frame(1000));
    expect(input.read(1100).throttle).toBeGreaterThan(0);
    expect(input.read(1400)).toEqual({ steer: 0, throttle: 0, drift: false, boost: false });
  });

  it('인식이 끊긴 사이에 대기 중이던 부스트는 버린다', () => {
    const input = make();
    input.push(frame(1000, SMILE));
    input.push(frame(1033, SMILE));
    expect(input.read(1500).boost).toBe(false);
    // 다시 결과가 와도 버린 부스트가 뒤늦게 나가지 않는다
    input.push(frame(1600, SMILE));
    expect(input.read(1610).boost).toBe(false);
  });

  it('얼굴이 보이는지는 마지막 결과와 그 시각으로 판단한다', () => {
    const input = make();
    expect(input.isFaceVisible(0)).toBe(false);
    input.push(frame(1000));
    expect(input.isFaceVisible(1100)).toBe(true);
    expect(input.isFaceVisible(1400)).toBe(false); // 인식이 300ms 넘게 멈추면 안 보이는 것으로 본다
    input.push(frame(1500, 0, false));
    expect(input.isFaceVisible(1510)).toBe(false);
  });
});

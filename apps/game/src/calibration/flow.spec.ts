import type { HandFrame, VisionFrame } from '@smilerider/controls';

import { advanceFlow, createFlow, flowResult, skipStep, switchToHeadTilt, type FlowState } from './flow';

interface Pose {
  left?: number;
  right?: number;
  jaw?: number;
  roll?: number;
  hand?: HandFrame | null;
  face?: boolean;
}

const NEUTRAL: Pose = {};
const fist: HandFrame = { gesture: 'Closed_Fist', score: 0.9 };
const thumb: HandFrame = { gesture: 'Thumb_Up', score: 0.9 };

let clock = 0;
const FRAME_MS = 33;

function frame(pose: Pose): VisionFrame {
  clock += FRAME_MS;
  return {
    timestamp: clock,
    face:
      pose.face === false
        ? null
        : {
            blendshapes: { eyeBlinkLeft: pose.left ?? 0.3, eyeBlinkRight: pose.right ?? 0.3, jawOpen: pose.jaw ?? 0.05 },
            headRollDeg: pose.roll ?? 0,
          },
    hand: pose.hand ?? null,
    handEvaluated: true,
  };
}

/** seconds 동안 같은 자세의 프레임을 넣는다 */
function hold(state: FlowState, pose: Pose, seconds: number): FlowState {
  let s = state;
  for (let i = 0; i < Math.round((seconds * 1000) / FRAME_MS); i++) s = advanceFlow(s, frame(pose));
  return s;
}

/** 단계나 안내가 바뀔 때까지(최대 15초) 같은 자세의 프레임을 넣는다 */
function untilChange(state: FlowState, pose: Pose): FlowState {
  let s = state;
  for (let i = 0; i < 15000 / FRAME_MS; i++) {
    s = advanceFlow(s, frame(pose));
    if (s.step !== state.step || s.notice !== state.notice) break;
  }
  return s;
}

function throughEyes(state: FlowState) {
  let s = untilChange(state, NEUTRAL);
  s = untilChange(s, { left: 0.8, right: 0.45 });
  return untilChange(s, { left: 0.4, right: 0.8 });
}

beforeEach(() => {
  clock = 0;
});

describe('보정 흐름', () => {
  it('평소 표정 3초를 재고 왼쪽 윙크로 넘어간다', () => {
    let s = hold(createFlow('wink'), NEUTRAL, 2.8);
    expect(s.step).toBe('neutral');
    s = hold(s, NEUTRAL, 0.4);
    expect(s.step).toBe('winkLeft');
  });

  it('평소 표정 단계에서 얼굴이 한 번도 안 보이면 다시 잰다', () => {
    const s = untilChange(createFlow('wink'), { face: false });
    expect(s.step).toBe('neutral');
    expect(s.notice).toBe('noFace');
  });

  it('윙크 두 단계가 성공하면 입 벌리기로 넘어간다', () => {
    expect(throughEyes(createFlow('wink')).step).toBe('jaw');
  });

  it('윙크 범위가 부족하면 왼쪽 윙크부터 다시, 두 번 실패하면 고개 기울이기를 권한다', () => {
    let s = untilChange(createFlow('wink'), NEUTRAL);
    s = untilChange(s, { left: 0.4 });
    s = untilChange(s, { right: 0.4 });
    expect(s.step).toBe('winkLeft');
    expect(s.notice).toBe('retry');
    s = untilChange(s, { left: 0.4 });
    s = untilChange(s, { right: 0.4 });
    expect(s.step).toBe('winkLeft');
    expect(s.notice).toBe('suggestHeadTilt');
  });

  it('고개 기울이기로 바꾸면 왼쪽으로 기울이는 단계에서 tiltSign을 정한다', () => {
    let s = untilChange(createFlow('wink'), NEUTRAL);
    s = switchToHeadTilt(s);
    expect(s.step).toBe('tiltLeft');
    expect(s.mode).toBe('headTilt');
    s = untilChange(s, { roll: 15 });
    expect(s.step).toBe('jaw');
    expect(s.tiltSign).toBe(-1);
  });

  it('기울기가 너무 작으면 다시 한다', () => {
    let s = switchToHeadTilt(untilChange(createFlow('wink'), NEUTRAL));
    s = untilChange(s, { roll: 2 });
    expect(s.step).toBe('tiltLeft');
    expect(s.notice).toBe('tiltTooSmall');
  });

  it('입 벌리기 → 주먹 → 엄지 척까지 마치면 done이고 보정값이 나온다', () => {
    let s = throughEyes(createFlow('wink'));
    s = untilChange(s, { jaw: 0.7 });
    expect(s.step).toBe('fist');
    s = untilChange(s, { hand: fist });
    expect(s.step).toBe('thumb');
    s = untilChange(s, { hand: thumb });
    expect(s.step).toBe('done');
    const result = flowResult(s);
    expect(result.mode).toBe('wink');
    expect(result.calibration.swapEyes).toBe(false);
    expect(result.calibration.max.eyeBlinkLeft).toBeCloseTo(0.8, 6);
    expect(result.calibration.max.eyeBlinkRight).toBeCloseTo(0.8, 6);
    expect(result.calibration.max.jawOpen).toBeCloseTo(0.7, 6);
  });

  it('입 범위가 부족하면 입 벌리기를 다시 한다', () => {
    let s = throughEyes(createFlow('wink'));
    s = untilChange(s, { jaw: 0.1 });
    expect(s.step).toBe('jaw');
    expect(s.notice).toBe('retry');
  });

  it('손동작이 10초 안에 인정되지 않으면 도움말을 띄우고, 건너뛸 수 있다', () => {
    let s = throughEyes(createFlow('wink'));
    s = untilChange(s, { jaw: 0.7 });
    s = untilChange(s, NEUTRAL);
    expect(s.step).toBe('fist');
    expect(s.notice).toBe('gestureHelp');
    expect(s.elapsed).toBeGreaterThanOrEqual(10);
    expect(skipStep(s).step).toBe('thumb');
  });
});

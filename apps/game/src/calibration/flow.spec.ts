import type { VisionFrame } from '@smilerider/controls';

import { advanceFlow, createFlow, flowResult, type FlowState } from './flow';

interface Pose {
  jaw?: number;
  smile?: number;
  roll?: number;
  face?: boolean;
}

const NEUTRAL: Pose = {};
const TILT_LEFT: Pose = { roll: 20 };
const JAW: Pose = { jaw: 0.79 };
const SMILE: Pose = { smile: 0.8 };

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
            blendshapes: { jawOpen: pose.jaw ?? 0.04, mouthSmile: pose.smile ?? 0 },
            headRollDeg: pose.roll ?? 0,
          },
  };
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

const through = (poses: Pose[]) => poses.reduce(untilChange, createFlow());

beforeEach(() => {
  clock = 0;
});

describe('보정 흐름', () => {
  it('평소 얼굴 3초를 재고 고개 기울이기로 넘어간다', () => {
    let s = createFlow();
    for (let i = 0; i < 2900 / FRAME_MS; i++) s = advanceFlow(s, frame(NEUTRAL));
    expect(s.step).toBe('neutral');
    s = untilChange(s, NEUTRAL);
    expect(s.step).toBe('tiltLeft');
    expect(s.notice).toBeNull();
  });

  it('평소 단계에서 얼굴이 한 번도 안 보이면 다시 잰다', () => {
    const s = through([{ face: false }]);
    expect(s.step).toBe('neutral');
    expect(s.notice).toBe('noFace');
  });

  it('왼쪽으로 +20° 기울이면 tiltSign -1로 입 벌리기로 넘어간다', () => {
    const s = through([NEUTRAL, TILT_LEFT]);
    expect(s.step).toBe('jaw');
    expect(s.tiltSign).toBe(-1);
  });

  it('기울기가 평소 각도 기준 5° 미만이면 tiltTooSmall로 다시 한다', () => {
    const s = through([NEUTRAL, { roll: 3 }]);
    expect(s.step).toBe('tiltLeft');
    expect(s.notice).toBe('tiltTooSmall');
  });

  it('입 범위가 0.15 미만이면 입 벌리기를 다시 한다', () => {
    const s = through([NEUTRAL, TILT_LEFT, { jaw: 0.1 }]);
    expect(s.step).toBe('jaw');
    expect(s.notice).toBe('retry');
  });

  it('웃음 범위가 0.15 미만이면 웃기를 다시 한다', () => {
    const s = through([NEUTRAL, TILT_LEFT, JAW, { smile: 0.1 }]);
    expect(s.step).toBe('smile');
    expect(s.notice).toBe('retry');
  });

  it('웃을 때 입이 드리프트 기준만큼 벌어지면 입을 다물고 웃도록 다시 한다 (레이스에서 부스트 대신 드리프트가 되므로)', () => {
    const s = through([NEUTRAL, TILT_LEFT, JAW, { smile: 0.8, jaw: 0.4 }]);
    expect(s.step).toBe('smile');
    expect(s.notice).toBe('smileMouthOpen');
  });

  it('네 단계를 마치면 done이고 보정값이 나온다', () => {
    const s = through([NEUTRAL, TILT_LEFT, JAW, SMILE]);
    expect(s.step).toBe('done');
    const result = flowResult(s);
    expect(result.neutral.jawOpen).toBeCloseTo(0.04, 6);
    expect(result.neutral.mouthSmile).toBe(0);
    expect(result.max).toEqual({ jawOpen: 0.79, mouthSmile: 0.8 });
    expect(result.neutralRollDeg).toBeCloseTo(0, 6);
    expect(result.tiltSign).toBe(-1);
  });

  it('done 전에 flowResult를 부르면 throw', () => {
    expect(() => flowResult(through([NEUTRAL, TILT_LEFT]))).toThrow();
  });
});

import {
  averageNeutral,
  calibrateMax,
  calibrateTilt,
  DEFAULT_CONTROLS_CONFIG,
  type Calibration,
  type FaceFrame,
  type NeutralPose,
  type VisionFrame,
} from '@smilerider/controls';

export type FlowStep = 'neutral' | 'tiltLeft' | 'jaw' | 'smile' | 'done';
export type FlowNotice = 'noFace' | 'retry' | 'tiltTooSmall' | null;

/** 각 단계의 길이(s). 평소 값은 기획 10.9의 neutralSeconds */
export const STEP_SECONDS: Record<Exclude<FlowStep, 'done'>, number> = {
  neutral: DEFAULT_CONTROLS_CONFIG.neutralSeconds,
  tiltLeft: 2,
  jaw: 2,
  smile: 2,
};

export interface FlowState {
  step: FlowStep;
  /** 현재 단계의 첫 프레임 시각(ms) */
  stepStart: number | null;
  /** 현재 단계에 들어온 뒤 지난 시간(s) */
  elapsed: number;
  frames: (FaceFrame | null)[];
  neutral: NeutralPose | null;
  tiltSign: 1 | -1;
  jawMax: number | null;
  smileMax: number | null;
  notice: FlowNotice;
}

const config = DEFAULT_CONTROLS_CONFIG;

export function createFlow(): FlowState {
  return {
    step: 'neutral',
    stepStart: null,
    elapsed: 0,
    frames: [],
    neutral: null,
    tiltSign: 1,
    jawMax: null,
    smileMax: null,
    notice: null,
  };
}

const go = (state: FlowState, step: FlowStep, notice: FlowNotice = null): FlowState => ({
  ...state,
  step,
  stepStart: null,
  elapsed: 0,
  frames: [],
  notice,
});

// 시간을 다 채운 단계의 결과로 다음 단계를 정한다
function finishStep(s: FlowState): FlowState {
  const neutral = s.neutral;
  if (s.step === 'neutral') {
    const measured = averageNeutral(s.frames);
    return measured ? go({ ...s, neutral: measured }, 'tiltLeft') : go(s, 'neutral', 'noFace');
  }
  // 평소 값 없이 다른 단계에 올 수는 없지만, 그런 경우 평소 값부터 다시 잰다
  if (!neutral) return go(s, 'neutral');
  switch (s.step) {
    case 'tiltLeft': {
      const tilt = calibrateTilt(neutral.rollDeg, s.frames, config);
      return tilt.ok ? go({ ...s, tiltSign: tilt.tiltSign }, 'jaw') : go(s, 'tiltLeft', 'tiltTooSmall');
    }
    case 'jaw': {
      const jaw = calibrateMax(neutral.blendshapes, s.frames, 'jawOpen', config);
      return jaw.ok ? go({ ...s, jawMax: jaw.max }, 'smile') : go(s, 'jaw', 'retry');
    }
    case 'smile': {
      const smile = calibrateMax(neutral.blendshapes, s.frames, 'mouthSmile', config);
      return smile.ok ? go({ ...s, smileMax: smile.max }, 'done') : go(s, 'smile', 'retry');
    }
    default:
      return s;
  }
}

export function advanceFlow(state: FlowState, frame: VisionFrame): FlowState {
  const step = state.step;
  if (step === 'done') return state;
  const stepStart = state.stepStart ?? frame.timestamp;
  const s: FlowState = {
    ...state,
    stepStart,
    elapsed: (frame.timestamp - stepStart) / 1000,
    frames: [...state.frames, frame.face],
  };
  return s.elapsed >= STEP_SECONDS[step] ? finishStep(s) : s;
}

export function flowResult(state: FlowState): Calibration {
  const { neutral, jawMax, smileMax } = state;
  if (state.step !== 'done' || !neutral || jawMax === null || smileMax === null) {
    throw new Error('보정이 끝나지 않았습니다');
  }
  return {
    neutral: neutral.blendshapes,
    max: { jawOpen: jawMax, mouthSmile: smileMax },
    neutralRollDeg: neutral.rollDeg,
    tiltSign: state.tiltSign,
  };
}

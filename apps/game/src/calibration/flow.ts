import {
  averageNeutral,
  calibrateEyes,
  calibrateJaw,
  DEFAULT_CONTROLS_CONFIG,
  type Blendshapes,
  type Calibration,
  type FaceFrame,
  type SteeringMode,
  type VisionFrame,
} from '@winkrider/controls';

export type FlowStep = 'neutral' | 'winkLeft' | 'winkRight' | 'tiltLeft' | 'jaw' | 'fist' | 'thumb' | 'done';
export type FlowNotice = 'noFace' | 'retry' | 'suggestHeadTilt' | 'tiltTooSmall' | 'gestureHelp' | null;

/** 시간을 재는 단계의 길이(s). 평소 값은 기획 10.9의 neutralSeconds */
export const STEP_SECONDS: Partial<Record<FlowStep, number>> = {
  neutral: DEFAULT_CONTROLS_CONFIG.neutralSeconds,
  winkLeft: 2,
  winkRight: 2,
  tiltLeft: 2,
  jaw: 2,
};
/** 손동작이 이 시간 안에 인정되지 않으면 도움말과 건너뛰기를 보여 준다 (기획 10.2) */
export const GESTURE_HELP_SECONDS = 10;

export interface FlowState {
  mode: SteeringMode;
  step: FlowStep;
  /** 현재 단계의 첫 프레임 시각(ms) */
  stepStart: number | null;
  /** 현재 단계에 들어온 뒤 지난 시간(s) */
  elapsed: number;
  frames: (FaceFrame | null)[];
  leftWink: (FaceFrame | null)[];
  neutral: Blendshapes | null;
  eyeMax: { left: number; right: number } | null;
  swapEyes: boolean;
  jawMax: number | null;
  tiltSign: 1 | -1;
  eyeFailures: number;
  gestureStreak: number;
  notice: FlowNotice;
}

const config = DEFAULT_CONTROLS_CONFIG;

export function createFlow(mode: SteeringMode): FlowState {
  return {
    mode,
    step: 'neutral',
    stepStart: null,
    elapsed: 0,
    frames: [],
    leftWink: [],
    neutral: null,
    eyeMax: null,
    swapEyes: false,
    jawMax: null,
    tiltSign: 1,
    eyeFailures: 0,
    gestureStreak: 0,
    notice: null,
  };
}

const go = (state: FlowState, step: FlowStep, notice: FlowNotice = null): FlowState => ({
  ...state,
  step,
  stepStart: null,
  elapsed: 0,
  frames: [],
  gestureStreak: 0,
  notice,
});

// 시간을 다 채운 단계의 결과로 다음 단계를 정한다
function finishTimedStep(s: FlowState): FlowState {
  const neutral = s.neutral;
  // 평소 값 없이 다른 단계에 올 수는 없지만, 그런 경우 평소 값부터 다시 잰다
  if (s.step !== 'neutral' && !neutral) return go(s, 'neutral');
  switch (s.step) {
    case 'neutral': {
      const measured = averageNeutral(s.frames);
      if (!measured) return go(s, 'neutral', 'noFace');
      return go({ ...s, neutral: measured }, s.mode === 'wink' ? 'winkLeft' : 'tiltLeft');
    }
    case 'winkLeft':
      return go({ ...s, leftWink: s.frames }, 'winkRight');
    case 'winkRight': {
      const eye = calibrateEyes(neutral as Blendshapes, s.leftWink, s.frames, config);
      if (eye.leftOk && eye.rightOk) {
        return go({ ...s, eyeMax: { left: eye.maxLeft, right: eye.maxRight }, swapEyes: eye.swapEyes }, 'jaw');
      }
      const eyeFailures = s.eyeFailures + 1;
      // 윙크가 두 번 실패하면 고개 기울이기 조향을 권한다
      return go({ ...s, eyeFailures }, 'winkLeft', eyeFailures >= 2 ? 'suggestHeadTilt' : 'retry');
    }
    case 'tiltLeft': {
      const rolls = s.frames.filter((f): f is FaceFrame => f !== null).map((f) => f.headRollDeg);
      const mean = rolls.length ? rolls.reduce((a, b) => a + b, 0) / rolls.length : 0;
      if (Math.abs(mean) < config.tiltDeadzoneDeg) return go(s, 'tiltLeft', 'tiltTooSmall');
      // 왼쪽으로 기울였을 때 steer가 음수(왼쪽)가 되도록 부호를 맞춘다
      return go({ ...s, tiltSign: mean > 0 ? -1 : 1 }, 'jaw');
    }
    case 'jaw': {
      const jaw = calibrateJaw(neutral as Blendshapes, s.frames, config);
      return jaw.ok ? go({ ...s, jawMax: jaw.max }, 'fist') : go(s, 'jaw', 'retry');
    }
    default:
      return s;
  }
}

export function advanceFlow(state: FlowState, frame: VisionFrame): FlowState {
  if (state.step === 'done') return state;
  const stepStart = state.stepStart ?? frame.timestamp;
  const s: FlowState = { ...state, stepStart, elapsed: (frame.timestamp - stepStart) / 1000 };

  if (s.step === 'fist' || s.step === 'thumb') {
    const target = s.step === 'fist' ? 'Closed_Fist' : 'Thumb_Up';
    if (frame.handEvaluated) {
      const recognized = frame.hand?.gesture === target && frame.hand.score >= config.gestureMinScore;
      s.gestureStreak = recognized ? s.gestureStreak + 1 : 0;
    }
    if (s.gestureStreak >= config.gestureStreak) return go(s, s.step === 'fist' ? 'thumb' : 'done');
    if (s.elapsed >= GESTURE_HELP_SECONDS) s.notice = 'gestureHelp';
    return s;
  }

  s.frames = [...s.frames, frame.face];
  return s.elapsed >= (STEP_SECONDS[s.step] ?? 0) ? finishTimedStep(s) : s;
}

/** 손동작 단계를 건너뛴다 */
export function skipStep(state: FlowState): FlowState {
  if (state.step === 'fist') return go(state, 'thumb');
  if (state.step === 'thumb') return go(state, 'done');
  return state;
}

/** 윙크 대신 고개 기울이기로 조향한다. 평소 값을 잰 뒤에만 단계가 바뀐다 */
export function switchToHeadTilt(state: FlowState): FlowState {
  if (!state.neutral) return { ...state, mode: 'headTilt' };
  return go({ ...state, mode: 'headTilt' }, 'tiltLeft');
}

export interface FlowResult {
  mode: SteeringMode;
  tiltSign: 1 | -1;
  calibration: Calibration;
}

export function flowResult(state: FlowState): FlowResult {
  const neutral = state.neutral;
  if (!neutral) throw new Error('보정이 끝나지 않았습니다');
  return {
    mode: state.mode,
    tiltSign: state.tiltSign,
    calibration: {
      neutral,
      // 고개 기울이기 모드에서는 눈 최대 값을 쓰지 않는다
      max: {
        eyeBlinkLeft: state.eyeMax?.left ?? neutral.eyeBlinkLeft + 1,
        eyeBlinkRight: state.eyeMax?.right ?? neutral.eyeBlinkRight + 1,
        jawOpen: state.jawMax ?? neutral.jawOpen + 1,
      },
      swapEyes: state.swapEyes,
    },
  };
}

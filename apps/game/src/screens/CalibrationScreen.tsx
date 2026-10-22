import type { SteeringMode, VisionFrame } from '@winkrider/controls';
import { useEffect, useState } from 'react';

import {
  advanceFlow,
  createFlow,
  flowResult,
  GESTURE_HELP_SECONDS,
  skipStep,
  STEP_SECONDS,
  switchToHeadTilt,
  type FlowResult,
} from '../calibration/flow';
import { CameraPreview } from '../hud/CameraPreview';
import { ko } from '../i18n/ko';
import { buttonStyle, screenStyle, secondaryButtonStyle } from './styles';

export interface CalibrationScreenProps {
  steering: SteeringMode;
  stream: MediaStream;
  /** 인식 결과를 받기 시작하고, 그만 받는 함수를 돌려준다 */
  subscribe: (listener: (frame: VisionFrame) => void) => () => void;
  onDone: (result: FlowResult) => void;
  onCancel: () => void;
}

/** 보정 겸 튜토리얼 (기획 10.2): 평소 표정 → 윙크 또는 고개 기울이기 → 입 → 주먹 → 엄지 척 */
export function CalibrationScreen({ steering, stream, subscribe, onDone, onCancel }: CalibrationScreenProps) {
  const [flow, setFlow] = useState(() => createFlow(steering));
  const [last, setLast] = useState<VisionFrame | null>(null);

  useEffect(
    () =>
      subscribe((frame) => {
        setLast(frame);
        setFlow((prev) => advanceFlow(prev, frame));
      }),
    [subscribe],
  );

  const duration = STEP_SECONDS[flow.step] ?? GESTURE_HELP_SECONDS;
  const progress = flow.step === 'done' ? 1 : Math.min(1, flow.elapsed / duration);
  const shapes = last?.face?.blendshapes;

  return (
    <main style={screenStyle}>
      <CameraPreview stream={stream} />
      <h1 style={{ margin: 0 }}>{ko.calibration.title}</h1>
      <p style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>{ko.calibration.steps[flow.step]}</p>
      {flow.notice && (
        <p role="alert" style={{ color: '#b42318', fontWeight: 700, margin: 0 }}>
          {ko.calibration.notices[flow.notice]}
        </p>
      )}
      <div style={{ width: 320, height: 10, background: 'rgba(0,0,0,0.1)', borderRadius: 5 }}>
        <div style={{ width: `${progress * 100}%`, height: '100%', background: '#e5484d', borderRadius: 5 }} />
      </div>
      {shapes && (
        <p style={{ margin: 0, fontVariantNumeric: 'tabular-nums', fontSize: 14, opacity: 0.7 }}>
          eyeBlinkLeft {shapes.eyeBlinkLeft.toFixed(2)} · eyeBlinkRight {shapes.eyeBlinkRight.toFixed(2)} · jawOpen{' '}
          {shapes.jawOpen.toFixed(2)} · {last?.hand?.gesture ?? '-'}
        </p>
      )}
      <div style={{ display: 'flex', gap: 12 }}>
        {flow.step === 'done' && (
          <button style={buttonStyle} onClick={() => onDone(flowResult(flow))}>
            {ko.calibration.start}
          </button>
        )}
        {flow.notice === 'suggestHeadTilt' && (
          <button style={buttonStyle} onClick={() => setFlow((prev) => switchToHeadTilt(prev))}>
            {ko.calibration.switchToTilt}
          </button>
        )}
        {flow.notice === 'gestureHelp' && (
          <button style={secondaryButtonStyle} onClick={() => setFlow((prev) => skipStep(prev))}>
            {ko.calibration.skip}
          </button>
        )}
        <button style={secondaryButtonStyle} onClick={onCancel}>
          {ko.calibration.cancel}
        </button>
      </div>
    </main>
  );
}

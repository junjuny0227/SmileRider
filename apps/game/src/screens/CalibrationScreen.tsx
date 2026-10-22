import type { Calibration, VisionFrame } from '@smilerider/controls';
import { useEffect, useState } from 'react';

import { advanceFlow, createFlow, flowResult, STEP_SECONDS } from '../calibration/flow';
import { CameraPreview } from '../hud/CameraPreview';
import { ko } from '../i18n/ko';
import { buttonStyle, screenStyle, secondaryButtonStyle } from './styles';

export interface CalibrationScreenProps {
  stream: MediaStream;
  /** 인식 결과를 받기 시작하고, 그만 받는 함수를 돌려준다 */
  subscribe: (listener: (frame: VisionFrame) => void) => () => void;
  onDone: (calibration: Calibration) => void;
  onCancel: () => void;
}

/** 보정 겸 튜토리얼 (기획 10.2): 평소 얼굴 → 고개 왼쪽 → 입 → 웃음 */
export function CalibrationScreen({ stream, subscribe, onDone, onCancel }: CalibrationScreenProps) {
  const [flow, setFlow] = useState(createFlow);
  const [last, setLast] = useState<VisionFrame | null>(null);

  useEffect(
    () =>
      subscribe((frame) => {
        setLast(frame);
        setFlow((prev) => advanceFlow(prev, frame));
      }),
    [subscribe],
  );

  const progress = flow.step === 'done' ? 1 : Math.min(1, flow.elapsed / STEP_SECONDS[flow.step]);
  const face = last?.face;

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
      {face && (
        <p style={{ margin: 0, fontVariantNumeric: 'tabular-nums', fontSize: 14, opacity: 0.7 }}>
          roll {face.headRollDeg.toFixed(1)}° · jawOpen {face.blendshapes.jawOpen.toFixed(2)} · mouthSmile{' '}
          {face.blendshapes.mouthSmile.toFixed(2)}
        </p>
      )}
      <div style={{ display: 'flex', gap: 12 }}>
        {flow.step === 'done' && (
          <button style={buttonStyle} onClick={() => onDone(flowResult(flow))}>
            {ko.calibration.start}
          </button>
        )}
        <button style={secondaryButtonStyle} onClick={onCancel}>
          {ko.calibration.cancel}
        </button>
      </div>
    </main>
  );
}

import type { ControlsConfig } from './config.js';
import type { BlendshapeName, Blendshapes, FaceFrame, NeutralPose } from './types.js';

const faces = (frames: (FaceFrame | null)[]) => frames.filter((f): f is FaceFrame => f !== null);

const mean = (values: number[]) => values.reduce((sum, v) => sum + v, 0) / values.length;

/** 얼굴이 보인 프레임만 평균낸다. 하나도 없으면 null */
export function averageNeutral(frames: (FaceFrame | null)[]): NeutralPose | null {
  const valid = faces(frames);
  if (valid.length === 0) return null;
  return {
    blendshapes: {
      jawOpen: mean(valid.map((f) => f.blendshapes.jawOpen)),
      mouthSmile: mean(valid.map((f) => f.blendshapes.mouthSmile)),
    },
    rollDeg: mean(valid.map((f) => f.headRollDeg)),
  };
}

/** 고개를 왼쪽으로 기울인 단계에서 조향 방향을 정한다 */
export function calibrateTilt(
  neutralRollDeg: number,
  frames: (FaceFrame | null)[],
  config: ControlsConfig,
): { tiltSign: 1 | -1; ok: boolean } {
  const valid = faces(frames);
  const tilt = valid.length ? mean(valid.map((f) => f.headRollDeg)) - neutralRollDeg : 0;
  // 왼쪽으로 기울였을 때 steer가 음수(왼쪽)가 되도록 부호를 맞춘다
  return { tiltSign: tilt > 0 ? -1 : 1, ok: Math.abs(tilt) >= config.tiltDeadzoneDeg };
}

/** 한 표정을 크게 지은 단계의 최댓값과 범위 확인 */
export function calibrateMax(
  neutral: Blendshapes,
  frames: (FaceFrame | null)[],
  name: BlendshapeName,
  config: ControlsConfig,
): { max: number; ok: boolean } {
  const max = faces(frames).reduce((m, f) => Math.max(m, f.blendshapes[name]), neutral[name]);
  return { max, ok: max - neutral[name] >= config.minRange };
}

/** (raw - neutral) / (max - neutral)을 0~1로 자른다 */
export function normalize(raw: number, neutral: number, max: number): number {
  if (max <= neutral) return 0;
  return Math.min(1, Math.max(0, (raw - neutral) / (max - neutral)));
}

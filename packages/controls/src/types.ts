export type BlendshapeName = 'jawOpen' | 'mouthSmile';

export type Blendshapes = Record<BlendshapeName, number>;

export interface FaceFrame {
  /** mouthSmile은 mouthSmileLeft와 mouthSmileRight의 평균 */
  blendshapes: Blendshapes;
  /** 화면 기준 오른쪽으로 기울이면 + (도) */
  headRollDeg: number;
}

export interface VisionFrame {
  timestamp: number;
  face: FaceFrame | null;
}

export interface NeutralPose {
  blendshapes: Blendshapes;
  rollDeg: number;
}

export interface Calibration {
  neutral: Blendshapes;
  max: Blendshapes;
  /** 평소 고개 기울기(도). 조향은 이 각도를 0으로 본다 */
  neutralRollDeg: number;
  /** 왼쪽으로 기울였을 때 steer가 음수가 되도록 곱하는 부호 */
  tiltSign: 1 | -1;
}

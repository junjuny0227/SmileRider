export type BlendshapeName = 'eyeBlinkLeft' | 'eyeBlinkRight' | 'jawOpen';

export type Blendshapes = Record<BlendshapeName, number>;

export interface FaceFrame {
  blendshapes: Blendshapes;
  /** 화면 기준 오른쪽으로 기울이면 + (도) */
  headRollDeg: number;
}

export interface HandFrame {
  /** MediaPipe 이름 그대로 ('Closed_Fist', 'Thumb_Up', 'None' 등) */
  gesture: string;
  score: number;
}

export interface VisionFrame {
  timestamp: number;
  face: FaceFrame | null;
  hand: HandFrame | null;
  /** 이번 프레임에 손 인식을 했는지. CPU 모드에서는 격프레임으로만 한다 */
  handEvaluated: boolean;
}

export interface Calibration {
  neutral: Blendshapes;
  max: Blendshapes;
  /** 실제 왼쪽 윙크에서 eyeBlinkRight가 더 오르면 true */
  swapEyes: boolean;
}

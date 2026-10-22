import type { VisionFrame } from '@smilerider/controls';

export type Delegate = 'GPU' | 'CPU';

export type ToWorker =
  | { type: 'init'; delegate: Delegate; wasmBase: string; faceModel: string; gestureModel: string }
  | { type: 'frame'; bitmap: ImageBitmap; timestamp: number; withHand: boolean };

export type FromWorker =
  | { type: 'ready'; delegate: Delegate }
  | { type: 'init-error'; delegate: Delegate; message: string }
  | { type: 'result'; frame: VisionFrame }
  | { type: 'frame-error'; message: string };

// 빌드할 때 vite.config.mts가 설치된 @mediapipe/tasks-vision 버전으로 채운다
declare const __MEDIAPIPE_VERSION__: string;

/** WASM과 모델은 직접 호스팅하고 경로에 버전을 넣는다 (기획 7장 배포) */
export const MEDIAPIPE_PATHS = {
  wasmBase: `/mediapipe/tasks-vision-${__MEDIAPIPE_VERSION__}`,
  faceModel: '/models/face_landmarker-float16-1.task',
  gestureModel: '/models/gesture_recognizer-float16-1.task',
};

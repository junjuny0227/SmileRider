import type { VisionFrame } from '@winkrider/controls';

import { classifyCameraError, type CameraErrorKind } from './camera-error';
import { MEDIAPIPE_PATHS, type Delegate, type FromWorker, type ToWorker } from './protocol';

export class VisionStartError extends Error {
  constructor(readonly kind: CameraErrorKind | 'model-load-failed') {
    super(kind);
    this.name = 'VisionStartError';
  }
}

export interface VisionClient {
  /** 카메라 미리보기에도 쓴다 */
  readonly video: HTMLVideoElement;
  readonly delegate: Delegate;
  stop(): void;
}

function createWorker(delegate: Delegate): Promise<Worker> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./vision.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (event: MessageEvent<FromWorker>) => {
      if (event.data.type === 'ready') resolve(worker);
      if (event.data.type === 'init-error') {
        worker.terminate();
        reject(new Error(event.data.message));
      }
    };
    worker.onerror = (event) => {
      worker.terminate();
      reject(new Error(event.message));
    };
    // 상대 경로로 주면 Vite 개발 서버가 public 파일 import로 보고 막으므로 전체 주소로 넘긴다 (기획 8.1)
    const origin = window.location.origin;
    const init: ToWorker = {
      type: 'init',
      delegate,
      wasmBase: origin + MEDIAPIPE_PATHS.wasmBase,
      faceModel: origin + MEDIAPIPE_PATHS.faceModel,
      gestureModel: origin + MEDIAPIPE_PATHS.gestureModel,
    };
    worker.postMessage(init);
  });
}

/** 카메라를 열고 Worker에서 인식을 시작한다. GPU가 안 되면 CPU로 한 번 더 시도한다 */
export async function startVision(onFrame: (frame: VisionFrame) => void): Promise<VisionClient> {
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 }, audio: false });
  } catch (error) {
    throw new VisionStartError(classifyCameraError(error));
  }

  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.srcObject = stream;
  await video.play();

  let worker: Worker;
  let delegate: Delegate = 'GPU';
  try {
    worker = await createWorker('GPU');
  } catch {
    try {
      delegate = 'CPU';
      worker = await createWorker('CPU');
    } catch {
      stream.getTracks().forEach((track) => track.stop());
      throw new VisionStartError('model-load-failed');
    }
  }

  let busy = false;
  let frameCount = 0;
  let callbackId = 0;
  let stopped = false;

  worker.onmessage = (event: MessageEvent<FromWorker>) => {
    if (event.data.type !== 'result') return;
    busy = false;
    if (!stopped) onFrame(event.data.frame);
  };

  // 새 카메라 프레임에만 인식하고, Worker가 이전 프레임을 처리 중이면 건너뛴다 (기획 8.1)
  const onVideoFrame = () => {
    if (stopped) return;
    callbackId = video.requestVideoFrameCallback(onVideoFrame);
    if (busy) return;
    busy = true;
    frameCount++;
    const timestamp = performance.now();
    // CPU에서는 손 인식을 격프레임으로 한다
    const withHand = delegate === 'GPU' || frameCount % 2 === 0;
    createImageBitmap(video).then(
      (bitmap) => {
        if (stopped) {
          bitmap.close();
          return;
        }
        const message: ToWorker = { type: 'frame', bitmap, timestamp, withHand };
        worker.postMessage(message, [bitmap]);
      },
      () => {
        busy = false;
      },
    );
  };
  callbackId = video.requestVideoFrameCallback(onVideoFrame);

  return {
    video,
    delegate,
    stop() {
      stopped = true;
      video.cancelVideoFrameCallback(callbackId);
      worker.terminate();
      stream.getTracks().forEach((track) => track.stop());
    },
  };
}

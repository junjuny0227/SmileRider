import type { VisionFrame } from '@smilerider/controls';

import { classifyCameraError, type CameraErrorKind } from './camera-error';
import { createFrameGate } from './frame-gate';
import { mountOffscreen } from './offscreen-video';
import { MEDIAPIPE_PATHS, type Delegate, type FromWorker, type ToWorker } from './protocol';

export class VisionStartError extends Error {
  constructor(readonly kind: CameraErrorKind | 'model-load-failed') {
    super(kind);
    this.name = 'VisionStartError';
  }
}

export interface VisionClient {
  /** 카메라 미리보기는 이 스트림을 자기 video로 따로 재생한다 */
  readonly stream: MediaStream;
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
  // 화면이 바뀌어도 멈추지 않도록 인식용 video는 화면 밖에 계속 붙여 둔다
  const unmountVideo = mountOffscreen(video);
  try {
    await video.play();
  } catch (error) {
    unmountVideo();
    stream.getTracks().forEach((track) => track.stop());
    throw new VisionStartError(classifyCameraError(error));
  }

  let worker: Worker;
  let delegate: Delegate = 'GPU';
  try {
    worker = await createWorker('GPU');
  } catch {
    try {
      delegate = 'CPU';
      worker = await createWorker('CPU');
    } catch {
      unmountVideo();
      stream.getTracks().forEach((track) => track.stop());
      throw new VisionStartError('model-load-failed');
    }
  }

  let callbackId = 0;
  let stopped = false;

  const gate = createFrameGate((frame) => {
    if (!stopped) onFrame(frame);
  });
  worker.onmessage = (event: MessageEvent<FromWorker>) => gate.handle(event.data);
  // 시작할 때 달아 둔 오류 처리기(init 실패용)를 바꾼다. Worker 오류가 나도 다음 프레임을 보낼 수 있게 한다
  worker.onerror = () => gate.release();

  // 새 카메라 프레임에만 인식하고, Worker가 이전 프레임을 처리 중이면 건너뛴다 (기획 8.1)
  const onVideoFrame = () => {
    if (stopped) return;
    callbackId = video.requestVideoFrameCallback(onVideoFrame);
    if (!gate.tryStart()) return;
    const timestamp = performance.now();
    createImageBitmap(video).then(
      (bitmap) => {
        if (stopped) {
          bitmap.close();
          return;
        }
        const message: ToWorker = { type: 'frame', bitmap, timestamp };
        worker.postMessage(message, [bitmap]);
      },
      () => gate.release(),
    );
  };
  callbackId = video.requestVideoFrameCallback(onVideoFrame);

  return {
    stream,
    delegate,
    stop() {
      stopped = true;
      video.cancelVideoFrameCallback(callbackId);
      worker.terminate();
      stream.getTracks().forEach((track) => track.stop());
      unmountVideo();
    },
  };
}

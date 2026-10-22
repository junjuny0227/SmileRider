/// <reference lib="webworker" />
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

import { toFaceFrame } from './face-frame';
import type { FromWorker, ToWorker } from './protocol';

declare const self: DedicatedWorkerGlobalScope;

let face: FaceLandmarker | null = null;

const post = (message: FromWorker) => self.postMessage(message);

async function init(msg: Extract<ToWorker, { type: 'init' }>) {
  // 모듈 Worker에서는 importScripts를 못 쓰므로 ES 모듈용 WASM 로더를 쓴다 (forVisionTasks의 두 번째 인자 true)
  const fileset = await FilesetResolver.forVisionTasks(msg.wasmBase, true);
  // MediaPipe는 모델을 만들 때마다 self.ModuleFactory를 지운다. 모듈 Worker에서는 import가 캐시되어
  // 로더가 다시 실행되지 않으므로 모델을 다시 만들 때 실패한다. 로더를 직접 불러와 만들기 전에 넣는다 (기획 8.1)
  const factory = (await import(/* @vite-ignore */ fileset.wasmLoaderPath)).default;
  (self as unknown as { ModuleFactory?: unknown }).ModuleFactory = factory;
  face = await FaceLandmarker.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: msg.faceModel, delegate: msg.delegate },
    runningMode: 'VIDEO',
    numFaces: 1,
    outputFaceBlendshapes: true,
    outputFacialTransformationMatrixes: true,
  });
}

function detect(msg: Extract<ToWorker, { type: 'frame' }>) {
  if (!face) return;
  const result = face.detectForVideo(msg.bitmap, msg.timestamp);
  const faceFrame = toFaceFrame(
    result.faceBlendshapes[0]?.categories,
    result.facialTransformationMatrixes?.[0]?.data,
  );
  post({ type: 'result', frame: { timestamp: msg.timestamp, face: faceFrame } });
}

self.onmessage = async (event: MessageEvent<ToWorker>) => {
  const msg = event.data;
  if (msg.type === 'init') {
    try {
      await init(msg);
      post({ type: 'ready', delegate: msg.delegate });
    } catch (error) {
      post({ type: 'init-error', delegate: msg.delegate, message: String(error) });
    }
    return;
  }
  try {
    detect(msg);
  } catch (error) {
    // GPU 컨텍스트 손실 등으로 한 프레임이 실패해도 메인 스레드가 다음 프레임을 보낼 수 있게 알린다
    post({ type: 'frame-error', message: String(error) });
  } finally {
    msg.bitmap.close();
  }
};

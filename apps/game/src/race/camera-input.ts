import {
  createFaceControlsState,
  updateFaceControls,
  type Calibration,
  type ControlsConfig,
  type SteeringMode,
  type VisionFrame,
} from '@smilerider/controls';
import { NO_INPUT, type ControlInput } from '@smilerider/kart';

// 인식 결과가 이 시간 넘게 오지 않으면 얼굴이 안 보이는 것으로 본다(ms)
const STALE_MS = 300;

export interface CameraInput {
  /** 인식 결과가 올 때마다 부른다 (초당 약 30번) */
  push(frame: VisionFrame): void;
  /** 주행 틱마다 부른다 (초당 60번). 결과가 만료됐으면 마지막 조작을 유지하지 않고 입력 없음을 돌려준다 */
  read(now: number): ControlInput;
  isFaceVisible(now: number): boolean;
}

/**
 * 인식 결과를 주행 입력으로 바꾼다. 주행 틱이 인식보다 잦으므로
 * 부스트는 인식 결과 하나당 한 번만 전달한다 (Pre-flight Ruling).
 */
export function createCameraInput(
  calibration: Calibration,
  mode: SteeringMode,
  tiltSign: 1 | -1,
  config: ControlsConfig,
): CameraInput {
  let state = createFaceControlsState();
  let input: ControlInput = NO_INPUT;
  let boostPending = false;
  let last: VisionFrame | null = null;
  const isFresh = (now: number) => !!last && now - last.timestamp <= STALE_MS;

  return {
    push(frame) {
      const result = updateFaceControls(state, frame, calibration, mode, tiltSign, config);
      state = result.state;
      input = result.input;
      if (result.input.boost) boostPending = true;
      last = frame;
    },
    read(now) {
      const boost = boostPending;
      boostPending = false;
      // 카메라나 Worker가 멈춰 결과가 끊기면, 일시정지되기 전 0.5초 동안 마지막 조향·가속으로 달리지 않게 한다
      if (!isFresh(now)) return NO_INPUT;
      return { ...input, boost };
    },
    isFaceVisible(now) {
      return !!last?.face && isFresh(now);
    },
  };
}

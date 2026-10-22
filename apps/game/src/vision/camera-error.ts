export type CameraErrorKind = 'permission-denied' | 'no-camera' | 'camera-busy' | 'unknown';

/** getUserMedia가 던진 오류를 안내 문구를 고를 수 있는 종류로 나눈다 */
export function classifyCameraError(error: unknown): CameraErrorKind {
  const name = error instanceof DOMException || error instanceof Error ? error.name : '';
  switch (name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'permission-denied';
    case 'NotFoundError':
    case 'OverconstrainedError':
      return 'no-camera';
    case 'NotReadableError':
      return 'camera-busy';
    default:
      return 'unknown';
  }
}

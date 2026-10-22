import { classifyCameraError } from './camera-error';

const domError = (name: string) => new DOMException('camera', name);

describe('classifyCameraError', () => {
  it('권한 거부는 permission-denied', () => {
    expect(classifyCameraError(domError('NotAllowedError'))).toBe('permission-denied');
    expect(classifyCameraError(domError('SecurityError'))).toBe('permission-denied');
  });

  it('카메라가 없으면 no-camera', () => {
    expect(classifyCameraError(domError('NotFoundError'))).toBe('no-camera');
    expect(classifyCameraError(domError('OverconstrainedError'))).toBe('no-camera');
  });

  it('다른 앱이 카메라를 쓰고 있으면 camera-busy', () => {
    expect(classifyCameraError(domError('NotReadableError'))).toBe('camera-busy');
  });

  it('그 밖의 값은 unknown', () => {
    expect(classifyCameraError(new Error('boom'))).toBe('unknown');
    expect(classifyCameraError('boom')).toBe('unknown');
    expect(classifyCameraError(undefined)).toBe('unknown');
  });
});

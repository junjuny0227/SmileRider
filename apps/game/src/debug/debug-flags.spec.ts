import { readDebugFlags } from './debug-flags';

describe('readDebugFlags', () => {
  it('enabled가 false면 주소 옵션을 모두 무시한다 (배포 빌드)', () => {
    expect(readDebugFlags('?debug=autopilot&laps=1', false)).toEqual({ autopilot: false, laps: null });
  });

  it('enabled면 ?debug=autopilot과 ?laps=1을 읽는다', () => {
    expect(readDebugFlags('?debug=autopilot&laps=1', true)).toEqual({ autopilot: true, laps: 1 });
    expect(readDebugFlags('', true)).toEqual({ autopilot: false, laps: null });
  });

  it('laps가 1 미만이거나 정수가 아니면 null', () => {
    expect(readDebugFlags('?laps=0', true).laps).toBeNull();
    expect(readDebugFlags('?laps=abc', true).laps).toBeNull();
    expect(readDebugFlags('?laps=1.5', true).laps).toBeNull();
  });
});

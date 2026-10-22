import { headRollDegFromMatrix } from './head-roll';

// Z축으로 deg만큼 회전한 4x4 행렬 (열 우선)
function rotationZ(deg: number): number[] {
  const r = (deg * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return [c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
}

describe('headRollDegFromMatrix', () => {
  it('단위 행렬은 0°', () => {
    expect(headRollDegFromMatrix(rotationZ(0))).toBeCloseTo(0, 6);
  });

  it('Z축으로 +20° 회전한 행렬은 20°, -35°는 -35°', () => {
    expect(headRollDegFromMatrix(rotationZ(20))).toBeCloseTo(20, 6);
    expect(headRollDegFromMatrix(rotationZ(-35))).toBeCloseTo(-35, 6);
  });

  it('이동 성분이 있어도 회전 각도만 읽는다', () => {
    const m = rotationZ(10);
    m[12] = 5;
    m[13] = -3;
    m[14] = -40;
    expect(headRollDegFromMatrix(m)).toBeCloseTo(10, 6);
  });
});

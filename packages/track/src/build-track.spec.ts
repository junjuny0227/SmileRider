import { buildTrack, sampleAt } from './build-track.js';
import { circle, figureEight } from './test-utils/fixtures.js';
import { dot } from './vec3.js';

describe('buildTrack', () => {
  it('원형 트랙의 길이는 원둘레에 가깝다', () => {
    expect(Math.abs(buildTrack(circle).length - 2 * Math.PI * 100)).toBeLessThan(5);
  });

  it('샘플 간격은 spacing을 따른다', () => {
    const t = buildTrack(circle, 1);
    expect(t.samples[1].s - t.samples[0].s).toBeCloseTo(1, 1);
    expect(t.samples[0].s).toBe(0);
  });

  it('첫 샘플은 첫 제어점(출발선)에 있다', () => {
    const p = buildTrack(circle).samples[0].position;
    expect(p.x).toBeCloseTo(0, 3);
    expect(p.z).toBeCloseTo(100, 3);
  });

  it('폭은 제어점 사이를 보간한다', () => {
    expect(sampleAt(buildTrack(circle), 37).width).toBeCloseTo(10, 5);
  });
});

describe('sampleAt', () => {
  it('길이로 감싼다', () => {
    const t = buildTrack(circle);
    expect(sampleAt(t, t.length + 10).s).toBeCloseTo(10, 1);
    expect(sampleAt(t, -10).s).toBeCloseTo(t.length - 10, 1);
  });

  it('right는 수평이고 tangent와 수직이다', () => {
    const s = sampleAt(buildTrack(circle), 50);
    expect(s.right.y).toBeCloseTo(0, 5);
    expect(dot(s.right, s.tangent)).toBeCloseTo(0, 5);
  });

  it('right는 진행 방향 기준 오른쪽이다', () => {
    // 출발선 (0, 0, 100)에서 다음 제어점 쪽(+X)으로 진행하므로, 오른쪽은 원의 바깥(+Z)
    const s = sampleAt(buildTrack(circle), 0);
    expect(s.tangent.x).toBeGreaterThan(0.9);
    expect(s.right.z).toBeGreaterThan(0.9);
  });

  it('경사 구간에서 up은 노면에 수직이고 위를 향한다', () => {
    const t = buildTrack(figureEight);
    const sloped = t.samples.find((s) => Math.abs(s.tangent.y) > 0.02);
    expect(sloped).toBeDefined();
    expect(dot(sloped!.up, sloped!.tangent)).toBeCloseTo(0, 5);
    expect(sloped!.up.y).toBeGreaterThan(0);
  });
});

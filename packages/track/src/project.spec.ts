import { buildTrack, sampleAt } from './build-track.js';
import { projectToTrack } from './project.js';
import { circle, figureEight } from './test-utils/fixtures.js';
import { add, scale } from './vec3.js';

describe('projectToTrack', () => {
  it('중심선 오른쪽 3m 지점은 lateral +3, s는 그 지점의 진행 거리', () => {
    const t = buildTrack(circle);
    const sample = sampleAt(t, 50);
    const point = add(sample.position, scale(sample.right, 3));
    const result = projectToTrack(t, point, 45);
    expect(result.lateral).toBeCloseTo(3, 1);
    expect(result.s).toBeCloseTo(50, 0);
  });

  it('중심선 왼쪽은 lateral이 음수', () => {
    const t = buildTrack(circle);
    const sample = sampleAt(t, 120);
    const point = add(sample.position, scale(sample.right, -2));
    expect(projectToTrack(t, point, 120).lateral).toBeCloseTo(-2, 1);
  });

  it('출발선을 넘어가는 위치도 감싸서 찾는다', () => {
    const t = buildTrack(circle);
    const point = sampleAt(t, 3).position;
    expect(projectToTrack(t, point, t.length - 5).s).toBeCloseTo(3, 0);
  });

  it('hintS 근처에서만 찾아, 위아래로 겹친 도로를 헷갈리지 않는다', () => {
    const t = buildTrack(figureEight);
    // 높이 10인 위 도로가 원점을 지나는 지점
    const upper = t.samples.reduce((best, s) =>
      Math.hypot(s.position.x, s.position.y - 10, s.position.z) <
      Math.hypot(best.position.x, best.position.y - 10, best.position.z)
        ? s
        : best,
    );
    // 아래 도로(높이 0)의 원점에 있는 점을 위 도로 쪽 hintS로 찾는다
    const result = projectToTrack(t, { x: 0, y: 0, z: 0 }, upper.s);
    expect(Math.abs(result.s - upper.s)).toBeLessThanOrEqual(30);
  });
});

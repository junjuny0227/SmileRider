import { hillSurface, stadiumSurface } from './test-utils/tracks.js';

describe('createRibbonSurface', () => {
  it('pointAt(s, 3)을 query하면 lateral ≈ 3, s는 그대로', () => {
    const surface = stadiumSurface();
    const point = surface.pointAt(50, 3);
    const q = surface.query(point, 48);
    expect(q.lateral).toBeCloseTo(3, 1);
    expect(q.s).toBeCloseTo(50, 0);
    expect(q.halfWidth).toBeCloseTo(5, 3);
  });

  it('groundY는 그 지점의 노면 높이', () => {
    const surface = hillSurface();
    const point = surface.pointAt(250, -2);
    const q = surface.query({ ...point, y: point.y + 3 }, 250);
    expect(q.groundY).toBeCloseTo(point.y, 1);
    expect(point.y).toBeGreaterThan(5);
  });

  it('length는 트랙 길이', () => {
    expect(stadiumSurface().length).toBeGreaterThan(1300);
  });
});

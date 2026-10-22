import { buildTrack, skyway } from '@winkrider/track';

import { buildRailPositions, buildRoadGeometry, pillarPositions } from './track-geometry';

const track = buildTrack(skyway);
const n = track.samples.length;

const vertex = (positions: Float32Array, i: number) => ({
  x: positions[i * 3],
  y: positions[i * 3 + 1],
  z: positions[i * 3 + 2],
});

describe('buildRoadGeometry', () => {
  const road = buildRoadGeometry(track);

  it('도로 정점 수는 샘플 수 × 2, 삼각형은 샘플 수 × 2개', () => {
    expect(road.positions.length).toBe(n * 2 * 3);
    expect(road.normals.length).toBe(n * 2 * 3);
    expect(road.uvs.length).toBe(n * 2 * 2);
    expect(road.indices.length).toBe(n * 2 * 3);
  });

  it('도로 정점은 중심선에서 폭의 절반만큼 좌우로 떨어져 있다', () => {
    for (const i of [0, Math.floor(n / 3), n - 1]) {
      const { position, width } = track.samples[i];
      for (const v of [vertex(road.positions, i * 2), vertex(road.positions, i * 2 + 1)]) {
        expect(Math.hypot(v.x - position.x, v.y - position.y, v.z - position.z)).toBeCloseTo(width / 2, 4);
      }
    }
  });

  it('삼각형은 위를 향한다', () => {
    for (let t = 0; t < road.indices.length; t += 3 * 97) {
      const a = vertex(road.positions, road.indices[t]);
      const b = vertex(road.positions, road.indices[t + 1]);
      const c = vertex(road.positions, road.indices[t + 2]);
      const ny = (b.z - a.z) * (c.x - a.x) - (b.x - a.x) * (c.z - a.z);
      expect(ny).toBeGreaterThan(0);
    }
  });
});

describe('buildRailPositions', () => {
  it('샘플마다 도로 가장자리에서 height만큼 위의 점 하나', () => {
    const rail = buildRailPositions(track, 1, 0.8);
    expect(rail.length).toBe(n * 3);
    const { position, right, width } = track.samples[10];
    const v = vertex(rail, 10);
    expect(v.x).toBeCloseTo(position.x + (right.x * width) / 2, 4);
    expect(v.y).toBeCloseTo(position.y + 0.8, 4);
    expect(v.z).toBeCloseTo(position.z + (right.z * width) / 2, 4);
  });
});

describe('pillarPositions', () => {
  it('교각은 높이 minHeight 이상인 구간에만, every m 간격으로 놓인다', () => {
    const pillars = pillarPositions(track, 4, 20);
    expect(pillars.length).toBeGreaterThan(10);
    for (const p of pillars) expect(p.y).toBeGreaterThanOrEqual(4);
    const elevated = track.samples.filter((s) => s.position.y >= 4).length * track.spacing;
    expect(pillars.length).toBeLessThanOrEqual(Math.ceil(elevated / 20) + 1);
  });
});

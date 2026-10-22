import { buildTrack, sampleAt } from '../build-track.js';
import type { TrackSample } from '../types.js';
import { skyway } from './skyway.js';

const track = buildTrack(skyway);

// 수평면에서 두 진행 방향 사이의 각도(도)
function headingDiffDeg(a: TrackSample, b: TrackSample): number {
  const ha = Math.atan2(a.tangent.x, a.tangent.z);
  const hb = Math.atan2(b.tangent.x, b.tangent.z);
  let d = Math.abs(ha - hb) % (2 * Math.PI);
  if (d > Math.PI) d = 2 * Math.PI - d;
  return (d * 180) / Math.PI;
}

describe('skyway', () => {
  it('이름은 스카이웨이, 2랩, 체크포인트 3개 이상', () => {
    expect(skyway).toMatchObject({ id: 'skyway', name: '스카이웨이', laps: 2 });
    expect(skyway.checkpoints.length).toBeGreaterThanOrEqual(3);
  });

  it('한 바퀴 길이는 1.3~1.7km', () => {
    expect(track.length).toBeGreaterThan(1300);
    expect(track.length).toBeLessThan(1700);
  });

  it('높이 10m 이상의 고가 직선이 300m 이상 이어진다', () => {
    let best = 0;
    let start: TrackSample | null = null;
    let run = 0;
    for (const sample of track.samples) {
      if (sample.position.y >= 10 && start && headingDiffDeg(start, sample) <= 5) {
        run += track.spacing;
      } else {
        start = sample.position.y >= 10 ? sample : null;
        run = 0;
      }
      best = Math.max(best, run);
    }
    expect(best).toBeGreaterThanOrEqual(300);
  });

  it('급경사 내리막이 있다 (20m 평균 경사 최솟값이 -10% ~ -25%)', () => {
    let steepest = 0;
    for (let s = 0; s < track.length; s += 1) {
      const slope = (sampleAt(track, s + 20).position.y - sampleAt(track, s).position.y) / 20;
      steepest = Math.min(steepest, slope);
    }
    expect(steepest).toBeLessThanOrEqual(-0.1);
    expect(steepest).toBeGreaterThanOrEqual(-0.25);
  });

  it('출발선 앞뒤 25m는 평지 직선이다', () => {
    const start = sampleAt(track, 0);
    for (let s = -25; s <= 25; s += 1) {
      const sample = sampleAt(track, s);
      expect(Math.abs(sample.position.y)).toBeLessThan(0.5);
      expect(headingDiffDeg(start, sample)).toBeLessThan(3);
    }
  });

  it('도로끼리 겹치는 곳은 높이 차이가 6m 이상이다', () => {
    const { samples, length } = track;
    for (let i = 0; i < samples.length; i += 2) {
      for (let j = i + 1; j < samples.length; j += 2) {
        const ds = Math.abs(samples[i].s - samples[j].s);
        if (Math.min(ds, length - ds) <= 50) continue;
        const a = samples[i].position;
        const b = samples[j].position;
        const horizontal = Math.hypot(a.x - b.x, a.z - b.z);
        if (horizontal <= (samples[i].width + samples[j].width) / 2) {
          expect(Math.abs(a.y - b.y)).toBeGreaterThanOrEqual(6);
        }
      }
    }
  });
});

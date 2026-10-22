import { sampleAt } from './build-track.js';
import type { Track, TrackProjection, Vec3 } from './types.js';
import { distance, dot, lerp, sub } from './vec3.js';

/**
 * hintS 앞뒤 searchRadius 안에서만 가장 가까운 중심선 위치를 찾는다.
 * 트랙 전체를 찾지 않으므로 위아래로 겹친 도로를 헷갈리지 않는다.
 */
export function projectToTrack(
  track: Track,
  point: Vec3,
  hintS: number,
  searchRadius = 30,
): TrackProjection {
  const { samples, spacing, length } = track;
  const count = samples.length;
  const center = Math.floor((((hintS % length) + length) % length) / spacing);
  const reach = Math.ceil(searchRadius / spacing);

  let bestS = 0;
  let bestDistance = Infinity;
  for (let offset = -reach; offset <= reach; offset++) {
    const i = (((center + offset) % count) + count) % count;
    const a = samples[i].position;
    const b = samples[(i + 1) % count].position;
    const ab = sub(b, a);
    const abLength2 = dot(ab, ab);
    const u = abLength2 === 0 ? 0 : Math.min(1, Math.max(0, dot(sub(point, a), ab) / abLength2));
    const d = distance(point, lerp(a, b, u));
    if (d < bestDistance) {
      bestDistance = d;
      bestS = samples[i].s + u * spacing;
    }
  }

  const sample = sampleAt(track, bestS);
  return { s: sample.s, lateral: dot(sub(point, sample.position), sample.right), sample };
}

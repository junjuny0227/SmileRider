import type { Track, TrackDefinition, TrackSample, Vec3 } from './types.js';
import { add, cross, distance, lerp, normalize, scale, sub, vec3 } from './vec3.js';

const STEPS_PER_SEGMENT = 200;
const WORLD_UP = vec3(0, 1, 0);

// centripetal Catmull-Rom (alpha = 0.5). p1과 p2 사이의 점을 u(0~1)로 구한다.
function catmullRom(p0: Vec3, p1: Vec3, p2: Vec3, p3: Vec3, u: number): Vec3 {
  const knot = (t: number, a: Vec3, b: Vec3) => t + Math.max(Math.sqrt(distance(a, b)), 1e-6);
  const t0 = 0;
  const t1 = knot(t0, p0, p1);
  const t2 = knot(t1, p1, p2);
  const t3 = knot(t2, p2, p3);
  const t = t1 + (t2 - t1) * u;
  const mix = (a: Vec3, b: Vec3, ta: number, tb: number) =>
    add(scale(a, (tb - t) / (tb - ta)), scale(b, (t - ta) / (tb - ta)));
  const a1 = mix(p0, p1, t0, t1);
  const a2 = mix(p1, p2, t1, t2);
  const a3 = mix(p2, p3, t2, t3);
  const b1 = mix(a1, a2, t0, t2);
  const b2 = mix(a2, a3, t1, t3);
  return mix(b1, b2, t1, t2);
}

export function buildTrack(definition: TrackDefinition, spacing = 1): Track {
  const points = definition.controlPoints;
  const n = points.length;

  // 1. 곡선을 촘촘히 계산하고 누적 거리표를 만든다
  const dense: { position: Vec3; width: number }[] = [];
  for (let i = 0; i < n; i++) {
    const p0 = points[(i - 1 + n) % n];
    const p1 = points[i];
    const p2 = points[(i + 1) % n];
    const p3 = points[(i + 2) % n];
    for (let k = 0; k < STEPS_PER_SEGMENT; k++) {
      const u = k / STEPS_PER_SEGMENT;
      dense.push({
        position: catmullRom(p0.position, p1.position, p2.position, p3.position, u),
        width: p1.width + (p2.width - p1.width) * u,
      });
    }
  }
  dense.push(dense[0]);
  const cumulative = [0];
  for (let i = 1; i < dense.length; i++) {
    cumulative.push(cumulative[i - 1] + distance(dense[i - 1].position, dense[i].position));
  }
  const length = cumulative[cumulative.length - 1];

  // 2. 길이를 나누어떨어지게 간격을 맞추고 다시 뽑는다
  const count = Math.max(3, Math.round(length / spacing));
  const step = length / count;
  const positions: Vec3[] = [];
  const widths: number[] = [];
  let j = 0;
  for (let k = 0; k < count; k++) {
    const s = k * step;
    while (cumulative[j + 1] < s) j++;
    const segment = cumulative[j + 1] - cumulative[j];
    const u = segment === 0 ? 0 : (s - cumulative[j]) / segment;
    positions.push(lerp(dense[j].position, dense[j + 1].position, u));
    widths.push(dense[j].width + (dense[j + 1].width - dense[j].width) * u);
  }

  // 3. 앞뒤 샘플로 진행 방향을 구하고 오른쪽·위 방향을 만든다
  const samples: TrackSample[] = positions.map((position, k) => {
    const tangent = normalize(sub(positions[(k + 1) % count], positions[(k - 1 + count) % count]));
    const right = normalize(cross(tangent, WORLD_UP));
    const up = normalize(cross(right, tangent));
    return { s: k * step, position, tangent, right, up, width: widths[k] };
  });

  return { definition, length, spacing: step, samples };
}

function wrap(s: number, length: number): number {
  return ((s % length) + length) % length;
}

export function sampleAt(track: Track, s: number): TrackSample {
  const wrapped = wrap(s, track.length);
  const count = track.samples.length;
  const index = Math.min(Math.floor(wrapped / track.spacing), count - 1);
  const u = wrapped / track.spacing - index;
  const a = track.samples[index];
  const b = track.samples[(index + 1) % count];
  return {
    s: wrapped,
    position: lerp(a.position, b.position, u),
    tangent: normalize(lerp(a.tangent, b.tangent, u)),
    right: normalize(lerp(a.right, b.right, u)),
    up: normalize(lerp(a.up, b.up, u)),
    width: a.width + (b.width - a.width) * u,
  };
}

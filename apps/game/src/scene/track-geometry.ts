import { sampleAt, type Track, type Vec3 } from '@smilerider/track';

export interface RibbonGeometry {
  positions: Float32Array;
  normals: Float32Array;
  uvs: Float32Array;
  indices: Uint32Array;
}

// 도로 텍스처가 진행 방향으로 반복되는 길이(m)
const UV_REPEAT = 10;

/**
 * 트랙 중심선 데이터로 도로 띠를 만든다. 주행 물리와 같은 데이터에서 만들므로
 * 눈에 보이는 도로와 충돌 판정이 정확히 맞는다 (기획 7장 3D 에셋).
 */
export function buildRoadGeometry(track: Track): RibbonGeometry {
  const n = track.samples.length;
  const positions = new Float32Array(n * 2 * 3);
  const normals = new Float32Array(n * 2 * 3);
  const uvs = new Float32Array(n * 2 * 2);
  const indices = new Uint32Array(n * 2 * 3);

  track.samples.forEach(({ position, right, up, width, s }, i) => {
    const half = width / 2;
    // 0 = 왼쪽 가장자리, 1 = 오른쪽 가장자리
    [-half, half].forEach((offset, side) => {
      const v = i * 2 + side;
      positions.set([position.x + right.x * offset, position.y + right.y * offset, position.z + right.z * offset], v * 3);
      normals.set([up.x, up.y, up.z], v * 3);
      uvs.set([side, s / UV_REPEAT], v * 2);
    });
    const a = i * 2;
    const b = a + 1;
    const c = ((i + 1) % n) * 2;
    const d = c + 1;
    indices.set([a, b, c, b, d, c], i * 6);
  });

  return { positions, normals, uvs, indices };
}

/** 도로 가장자리(side 1 = 오른쪽, -1 = 왼쪽)에서 height만큼 위를 지나는 가드레일 선 */
export function buildRailPositions(track: Track, side: 1 | -1, height: number): Float32Array {
  const rail = new Float32Array(track.samples.length * 3);
  track.samples.forEach(({ position, right, width }, i) => {
    const offset = (side * width) / 2;
    rail.set([position.x + right.x * offset, position.y + height, position.z + right.z * offset], i * 3);
  });
  return rail;
}

/** 높이가 minHeight 이상인 구간에 every m 간격으로 고가 교각을 놓을 위치 (도로 높이의 중심선 점) */
export function pillarPositions(track: Track, minHeight: number, every: number): Vec3[] {
  const result: Vec3[] = [];
  for (let s = 0; s < track.length; s += every) {
    const { position } = sampleAt(track, s);
    if (position.y >= minHeight) result.push(position);
  }
  return result;
}

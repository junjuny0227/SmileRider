import { sampleAt, type Track, type Vec3 } from '@winkrider/track';

export type PropKind =
  | 'building-a'
  | 'building-c'
  | 'building-f'
  | 'building-k'
  | 'tree-large'
  | 'tree-small'
  | 'street-light';

export interface PropPlacement {
  kind: PropKind;
  /** 땅 위의 위치 (y = 0) */
  position: Vec3;
  /** 도로를 바라보는 방향(rad) */
  rotationY: number;
}

/** 소품은 도로 가장자리에서 이만큼 더 떨어진 트랙 바깥에만 놓는다(m) (기획 7장 3D 에셋) */
export const PROP_CLEARANCE = 6;

const EVERY = 20;
const BUILDINGS: PropKind[] = ['building-a', 'building-c', 'building-f', 'building-k'];
// 소품이 차지하는 반지름(m)
const FOOTPRINT = { building: 6, tree: 2, street: 0.5 } as const;
const SEED = 7;

type Group = keyof typeof FOOTPRINT;
const groupOf = (kind: PropKind) => kind.split('-')[0] as Group;

// 매번 같은 배치가 나오도록 고정 시드 난수(mulberry32)를 쓴다
function seededRandom(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 어느 도로 샘플과도 겹치지 않는지 (커브 안쪽에서 반대편 도로와 겹치는 경우도 거른다)
function isClear(track: Track, position: Vec3, footprint: number) {
  return track.samples.every(
    (s) =>
      Math.hypot(position.x - s.position.x, position.z - s.position.z) >= s.width / 2 + PROP_CLEARANCE + footprint,
  );
}

/** 트랙 양옆에 건물, 나무, 가로등을 배치한다. 위치는 트랙 중심선 데이터로 정한다 */
export function placeProps(track: Track): PropPlacement[] {
  const random = seededRandom(SEED);
  const result: PropPlacement[] = [];
  for (let s = 0; s < track.length; s += EVERY) {
    const sample = sampleAt(track, s);
    for (const side of [1, -1]) {
      const roll = random();
      const kind: PropKind =
        roll < 0.3
          ? 'street-light'
          : roll < 0.65
            ? random() < 0.5
              ? 'tree-large'
              : 'tree-small'
            : BUILDINGS[Math.floor(random() * BUILDINGS.length)];
      const group = groupOf(kind);
      const offset = sample.width / 2 + PROP_CLEARANCE + FOOTPRINT[group] + (group === 'street' ? 0 : random() * 12);
      const position = {
        x: sample.position.x + sample.right.x * side * offset,
        y: 0,
        z: sample.position.z + sample.right.z * side * offset,
      };
      if (!isClear(track, position, FOOTPRINT[group])) continue;
      result.push({ kind, position, rotationY: Math.atan2(-sample.right.x * side, -sample.right.z * side) });
    }
  }
  return result;
}

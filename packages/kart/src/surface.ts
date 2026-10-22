import { add, projectToTrack, sampleAt, scale, type Track, type Vec3 } from '@winkrider/track';

export interface SurfaceQuery {
  s: number;
  lateral: number;
  halfWidth: number;
  groundY: number;
  up: Vec3;
  right: Vec3;
  tangent: Vec3;
}

/**
 * 노면 높이와 벽 판정을 맡는 모듈. 지금은 트랙 중심선 리본으로 계산하고,
 * 나중에 물리 엔진을 도입하면 이 인터페이스의 구현만 바꾼다 (기획 7장 물리 엔진 도입 계획).
 */
export interface TrackSurface {
  readonly length: number;
  query(position: Vec3, hintS: number): SurfaceQuery;
  /** 중심선에서 오른쪽으로 lateral만큼 떨어진 노면 위의 점 */
  pointAt(s: number, lateral: number): Vec3;
}

export function createRibbonSurface(track: Track): TrackSurface {
  return {
    length: track.length,
    query(position, hintS) {
      const { s, lateral, sample } = projectToTrack(track, position, hintS);
      return {
        s,
        lateral,
        halfWidth: sample.width / 2,
        groundY: sample.position.y,
        up: sample.up,
        right: sample.right,
        tangent: sample.tangent,
      };
    },
    pointAt(s, lateral) {
      const sample = sampleAt(track, s);
      return add(sample.position, scale(sample.right, lateral));
    },
  };
}

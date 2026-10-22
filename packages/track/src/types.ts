export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface TrackControlPoint {
  position: Vec3;
  /** 도로 폭(m) */
  width: number;
}

export interface TrackDefinition {
  id: string;
  name: string;
  laps: number;
  /** 닫힌 곡선. 첫 점이 출발선 */
  controlPoints: TrackControlPoint[];
  /** 출발선을 뺀 체크포인트. 진행 거리 비율(0~1), 오름차순 */
  checkpoints: number[];
}

export interface TrackSample {
  /** 출발선부터의 진행 거리(m) */
  s: number;
  /** 중심선 위의 점 */
  position: Vec3;
  /** 진행 방향 단위 벡터 */
  tangent: Vec3;
  /** 진행 방향 기준 오른쪽, 수평 단위 벡터 */
  right: Vec3;
  /** 노면 법선 단위 벡터 */
  up: Vec3;
  width: number;
}

export interface Track {
  definition: TrackDefinition;
  length: number;
  spacing: number;
  samples: TrackSample[];
}

export interface TrackProjection {
  s: number;
  /** 중심선에서 떨어진 거리. 오른쪽이 + */
  lateral: number;
  sample: TrackSample;
}

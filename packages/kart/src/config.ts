const DEG = Math.PI / 180;

/** 게임 밸런스 수치. 초기값은 기획 10.9이며, 플레이하면서 이 파일에서만 조정한다 */
export interface KartConfig {
  /** m/s */
  maxSpeed: number;
  /** 정지 → 최고 속도까지 걸리는 시간(s) */
  accelTime: number;
  /** 엑셀을 뗐을 때 감속(m/s²) */
  coastDecel: number;
  /** 최대 회전 속도(rad/s) */
  maxYawRate: number;
  driftYawMultiplier: number;
  /** 드리프트 중 감속(m/s²) */
  driftDecel: number;
  /** rad */
  maxDriftAngle: number;
  /** 드리프트 중 진행 방향이 차 앞 방향을 따라오는 비율(1/s). 작을수록 바깥으로 오래 밀린다 */
  driftGrip: number;
  /** 드리프트 중 초당 게이지 충전량 */
  gaugePerSecond: number;
  maxBoosters: number;
  /** s */
  boostDuration: number;
  boostSpeedMultiplier: number;
  /** 벽에 처음 닿을 때 남는 속도 비율 */
  wallSpeedFactor: number;
  /** m */
  kartHalfWidth: number;
}

export const DEFAULT_KART_CONFIG: KartConfig = {
  maxSpeed: 30,
  accelTime: 4,
  coastDecel: 5,
  maxYawRate: 90 * DEG,
  driftYawMultiplier: 1.5,
  driftDecel: 2,
  maxDriftAngle: 40 * DEG,
  driftGrip: 3.5,
  gaugePerSecond: 0.35,
  maxBoosters: 2,
  boostDuration: 1.5,
  boostSpeedMultiplier: 1.4,
  wallSpeedFactor: 0.5,
  kartHalfWidth: 0.8,
};

export const TICK_RATE = 60;
export const TICK_DT = 1 / TICK_RATE;

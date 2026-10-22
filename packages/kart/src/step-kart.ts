import type { KartConfig } from './config.js';
import type { TrackSurface } from './surface.js';
import type { ControlInput, KartState } from './types.js';

// 벽에 붙어 미끄러지는 동안에도 닿은 상태로 보도록 두는 여유(m)
const WALL_EPSILON = 0.01;
// 부스트 남은 시간의 부동소수점 오차를 0으로 보는 기준(s)
const TIME_EPSILON = 1e-9;
// 드리프트 미끄러짐 각도가 커지는 속도와 풀릴 때 돌아오는 속도(rad/s)
const DRIFT_GROW_RATE = (60 * Math.PI) / 180;
const DRIFT_RELEASE_RATE = (90 * Math.PI) / 180;

const headingOf = (v: { x: number; z: number }) => Math.atan2(v.x, v.z);

export function createKartState(surface: TrackSurface, s = 0): KartState {
  const position = surface.pointAt(s, 0);
  const q = surface.query(position, s);
  return {
    position,
    heading: headingOf(q.tangent),
    speed: 0,
    s: q.s,
    lateral: q.lateral,
    up: q.up,
    driftAngle: 0,
    drifting: false,
    boostGauge: 0,
    boosters: 0,
    boostTimeLeft: 0,
    touchingWall: false,
  };
}

export function stepKart(
  state: KartState,
  input: ControlInput,
  surface: TrackSurface,
  config: KartConfig,
  dt: number,
): KartState {
  const drifting = input.drift && Math.abs(input.steer) > 0.1 && state.speed > 10;

  // 부스트 시작
  let boosters = state.boosters;
  let boostTimeLeft = state.boostTimeLeft;
  if (input.boost && boosters > 0 && boostTimeLeft <= 0) {
    boosters--;
    boostTimeLeft = config.boostDuration;
  }
  const boosting = boostTimeLeft > 0;

  // 1. 속도
  const target = config.maxSpeed * Math.min(1, Math.max(0, input.throttle));
  let speed = state.speed;
  if (boosting) speed = config.maxSpeed * config.boostSpeedMultiplier;
  else if (drifting) speed = Math.max(0, speed - config.driftDecel * dt);
  else if (speed < target) speed = Math.min(target, speed + (config.maxSpeed / config.accelTime) * dt);
  else if (speed > target) speed = Math.max(target, speed - config.coastDecel * dt);

  // 2. 방향 (steer가 음수면 왼쪽 = heading 증가)
  const yawRate = config.maxYawRate * (drifting ? config.driftYawMultiplier : 1);
  let heading = state.heading - input.steer * yawRate * Math.min(1, speed / 5) * dt;

  // 드리프트 미끄러짐 각도: 진행 방향이 heading보다 늦게 따라오도록 조향 반대쪽으로 벌어진다
  const driftTarget = drifting ? Math.sign(input.steer) * config.maxDriftAngle : 0;
  const driftRate = (drifting ? DRIFT_GROW_RATE : DRIFT_RELEASE_RATE) * dt;
  const driftAngle =
    Math.abs(driftTarget - state.driftAngle) <= driftRate
      ? driftTarget
      : state.driftAngle + Math.sign(driftTarget - state.driftAngle) * driftRate;

  // 부스트 게이지
  let boostGauge = state.boostGauge;
  if (drifting) {
    boostGauge += config.gaugePerSecond * dt;
    while (boostGauge >= 1 && boosters < config.maxBoosters) {
      boosters++;
      boostGauge -= 1;
    }
    if (boosters >= config.maxBoosters) boostGauge = Math.min(boostGauge, 1);
  }
  if (boosting) {
    const left = boostTimeLeft - dt;
    boostTimeLeft = left > TIME_EPSILON ? left : 0;
  }

  // 3. 수평 이동 (드리프트 중이면 미끄러짐 각도만큼 틀어진 방향)
  const moveHeading = heading + driftAngle;
  const moved = {
    x: state.position.x + Math.sin(moveHeading) * speed * dt,
    y: state.position.y,
    z: state.position.z + Math.cos(moveHeading) * speed * dt,
  };

  // 4. 노면
  const q = surface.query(moved, state.s);
  let position = { x: moved.x, y: q.groundY, z: moved.z };
  let lateral = q.lateral;

  // 5. 벽
  const limit = q.halfWidth - config.kartHalfWidth;
  const touchingWall = Math.abs(lateral) >= limit - WALL_EPSILON;
  if (touchingWall) {
    const side = Math.sign(lateral) || 1;
    if (Math.abs(lateral) > limit) {
      lateral = side * limit;
      position = surface.pointAt(q.s, lateral);
    }
    if (!state.touchingWall) speed *= config.wallSpeedFactor;
    // 벽을 향하고 있으면 벽을 따라 미끄러지도록 진행 방향을 트랙 방향으로 돌린다
    const intoWall = (Math.sin(moveHeading) * q.right.x + Math.cos(moveHeading) * q.right.z) * side > 0;
    if (intoWall) {
      const along = headingOf(q.tangent);
      heading = Math.cos(heading - along) >= 0 ? along : along + Math.PI;
    }
  }

  return {
    ...state,
    position,
    heading,
    speed,
    s: q.s,
    lateral,
    up: q.up,
    driftAngle,
    drifting,
    boostGauge,
    boosters,
    boostTimeLeft,
    touchingWall,
  };
}

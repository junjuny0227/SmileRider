import type { KartConfig } from './config.js';
import type { TrackSurface } from './surface.js';
import type { ControlInput, KartState } from './types.js';

// 벽에 붙어 미끄러지는 동안에도 닿은 상태로 보도록 두는 여유(m)
const WALL_EPSILON = 0.01;

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
  // 1. 속도
  const target = config.maxSpeed * Math.min(1, Math.max(0, input.throttle));
  let speed = state.speed;
  if (speed < target) speed = Math.min(target, speed + (config.maxSpeed / config.accelTime) * dt);
  else if (speed > target) speed = Math.max(target, speed - config.coastDecel * dt);

  // 2. 방향 (steer가 음수면 왼쪽 = heading 증가)
  let heading = state.heading - input.steer * config.maxYawRate * Math.min(1, speed / 5) * dt;

  // 3. 수평 이동
  const moved = {
    x: state.position.x + Math.sin(heading) * speed * dt,
    y: state.position.y,
    z: state.position.z + Math.cos(heading) * speed * dt,
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
    const intoWall = (Math.sin(heading) * q.right.x + Math.cos(heading) * q.right.z) * side > 0;
    if (intoWall) {
      const along = headingOf(q.tangent);
      heading = Math.cos(heading - along) >= 0 ? along : along + Math.PI;
    }
  }

  return { ...state, position, heading, speed, s: q.s, lateral, up: q.up, touchingWall };
}

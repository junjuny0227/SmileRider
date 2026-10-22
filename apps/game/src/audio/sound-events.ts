import type { RaceSession } from '../race/session';
import type { SfxName } from './sfx';

const counting = (s: RaceSession) => s.phase === 'countdown' || s.phase === 'resuming';

/** 주행 틱 하나 전후의 상태를 비교해 낼 효과음을 고른다 */
export function soundEvents(prev: RaceSession, next: RaceSession): SfxName[] {
  const events: SfxName[] = [];

  if (counting(next)) {
    const entered = next.phase === 'resuming' && prev.phase !== 'resuming';
    const firstTick = next.phase === 'countdown' && prev.phase === 'countdown' && prev.phaseTime === 0 && next.phaseTime > 0;
    const secondPassed = prev.phase === next.phase && Math.floor(prev.phaseTime) !== Math.floor(next.phaseTime);
    if (entered || firstTick || secondPassed) events.push('countdownBeep');
  }
  if (counting(prev) && next.phase === 'racing') events.push('countdownGo');
  if (next.kart.boosters > prev.kart.boosters) events.push('boosterGained');
  if (prev.kart.boostTimeLeft === 0 && next.kart.boostTimeLeft > 0) events.push('boost');
  if (!prev.kart.touchingWall && next.kart.touchingWall) events.push('wallHit');
  if (prev.phase !== 'finished' && next.phase === 'finished') events.push('finish');

  return events;
}

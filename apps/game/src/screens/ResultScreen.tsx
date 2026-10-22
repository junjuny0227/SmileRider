import { TICK_RATE } from '@smilerider/kart';

import { formatRaceTime } from '../i18n/format';
import { ko } from '../i18n/ko';
import type { RaceSession, InputMode } from '../race/session';
import type { SaveOutcome } from '../records/records';
import { buttonStyle, screenStyle, secondaryButtonStyle } from './styles';

export interface ResultScreenProps {
  session: RaceSession;
  mode: InputMode;
  outcome: SaveOutcome;
  onRetry: () => void;
  onHome: () => void;
}

const ticksToMs = (ticks: number) => (ticks * 1000) / TICK_RATE;

/** 결과 화면: 전체 기록, 랩별 기록, 최고 기록 여부, 조작 방식 (기획 10.2) */
export function ResultScreen({ session, mode, outcome, onRetry, onHome }: ResultScreenProps) {
  const bestLap = Math.min(...session.lapTicks);
  return (
    <main style={screenStyle}>
      <h1 style={{ fontSize: 48, margin: 0 }}>{ko.result.finished}</h1>
      <p style={{ margin: 0 }}>{mode === 'keyboard' ? ko.result.keyboardRecord : ko.result.cameraRecord}</p>
      <div>
        <div style={{ fontSize: 14 }}>{ko.result.total}</div>
        <div style={{ fontSize: 40, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
          {formatRaceTime(ticksToMs(session.raceTicks))}
        </div>
        {outcome.isBestTotal && <strong style={{ color: '#e5484d' }}>{ko.result.newBest}</strong>}
      </div>
      <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {session.lapTicks.map((ticks, i) => (
          <li key={i} style={{ fontVariantNumeric: 'tabular-nums' }}>
            {ko.result.lap(i + 1)} {formatRaceTime(ticksToMs(ticks))}{' '}
            {ticks === bestLap && outcome.isBestLap && <strong style={{ color: '#e5484d' }}>{ko.result.newBest}</strong>}
          </li>
        ))}
      </ol>
      <div style={{ display: 'flex', gap: 12 }}>
        <button style={buttonStyle} onClick={onRetry}>
          {ko.result.retry}
        </button>
        <button style={secondaryButtonStyle} onClick={onHome}>
          {ko.result.home}
        </button>
      </div>
    </main>
  );
}

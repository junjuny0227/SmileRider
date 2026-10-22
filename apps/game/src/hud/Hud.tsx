import { NO_INPUT, TICK_RATE, type ControlInput } from '@smilerider/kart';
import { useEffect, useState, type CSSProperties, type RefObject } from 'react';

import { formatRaceTime, formatSpeed } from '../i18n/format';
import { ko } from '../i18n/ko';
import { COUNTDOWN_SECONDS, type RaceSession } from '../race/session';
import { InputIndicator } from './InputIndicator';

const REFRESH_MS = 100;

interface HudProps {
  session: RefObject<RaceSession>;
  input: RefObject<ControlInput>;
  laps: number;
}

const panel: CSSProperties = {
  position: 'absolute',
  color: '#fff',
  textShadow: '0 1px 3px rgba(0,0,0,0.6)',
  fontVariantNumeric: 'tabular-nums',
};

const ticksToMs = (ticks: number) => (ticks * 1000) / TICK_RATE;

/** 속도, 부스트, 랩과 기록, 카운트다운, 입력 표시. 매 프레임이 아니라 100ms마다 갱신한다 (기획 7장) */
export function Hud({ session, input, laps }: HudProps) {
  const [view, setView] = useState({ session: session.current, input: input.current ?? NO_INPUT });
  useEffect(() => {
    const id = setInterval(() => setView({ session: session.current, input: input.current ?? NO_INPUT }), REFRESH_MS);
    return () => clearInterval(id);
  }, [session, input]);

  const s = view.session;
  const lapStart = s.lapTicks.reduce((a, b) => a + b, 0);
  const counting = s.phase === 'countdown' || s.phase === 'resuming';
  const showGo = s.phase === 'racing' && s.phaseTime < 1;

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ ...panel, top: 16, left: 16, fontSize: 18, lineHeight: 1.5 }}>
        <div style={{ fontSize: 24, fontWeight: 800 }}>{ko.hud.lap(Math.min(s.progress.completedLaps + 1, laps), laps)}</div>
        <div>
          {ko.hud.lapTime} {formatRaceTime(ticksToMs(s.raceTicks - lapStart))}
        </div>
        <div>
          {ko.hud.totalTime} {formatRaceTime(ticksToMs(s.raceTicks))}
        </div>
      </div>

      <div style={{ ...panel, bottom: 16, right: 16, textAlign: 'right' }}>
        <div style={{ fontSize: 48, fontWeight: 800 }}>
          {formatSpeed(s.kart.speed)} <span style={{ fontSize: 18 }}>{ko.hud.speedUnit}</span>
        </div>
        <div style={{ marginTop: 4 }}>
          {ko.hud.boosters} {'●'.repeat(s.kart.boosters)}
          {'○'.repeat(Math.max(0, 2 - s.kart.boosters))}
        </div>
        <div style={{ width: 200, height: 10, background: 'rgba(255,255,255,0.25)', borderRadius: 5, marginTop: 6 }}>
          <div style={{ width: `${s.kart.boostGauge * 100}%`, height: '100%', background: '#4cc9f0', borderRadius: 5 }} />
        </div>
      </div>

      <div style={{ ...panel, bottom: 16, left: 16 }}>
        <InputIndicator input={view.input} />
      </div>

      {(counting || showGo) && (
        <div style={{ ...panel, inset: 0, display: 'grid', placeItems: 'center', fontSize: 120, fontWeight: 900 }}>
          {counting ? Math.max(1, Math.ceil(COUNTDOWN_SECONDS - s.phaseTime)) : ko.hud.go}
        </div>
      )}

      {s.progress.wrongWay && s.phase === 'racing' && (
        <div style={{ ...panel, top: '30%', width: '100%', textAlign: 'center', fontSize: 48, fontWeight: 900, color: '#ff5d5d' }}>
          {ko.hud.wrongWay}
        </div>
      )}

      {s.phase === 'paused' && (
        <div style={{ ...panel, inset: 0, display: 'grid', placeItems: 'center', background: 'rgba(0,0,0,0.5)', textAlign: 'center' }}>
          <div>
            <div style={{ fontSize: 40, fontWeight: 800 }}>{ko.hud.faceLost}</div>
            <div style={{ fontSize: 20, marginTop: 8 }}>{ko.hud.faceLostHint}</div>
          </div>
        </div>
      )}
    </div>
  );
}

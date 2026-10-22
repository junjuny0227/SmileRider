import { createKeyTracker } from '@winkrider/controls';
import { createRibbonSurface, TICK_RATE } from '@winkrider/kart';
import { buildTrack, skyway } from '@winkrider/track';
import { useEffect, useMemo, useState } from 'react';

import { formatRaceTime } from './i18n/format';
import { ko } from './i18n/ko';
import type { RaceSession } from './race/session';
import { RaceScreen } from './screens/RaceScreen';

// 게임 키는 페이지 스크롤 같은 브라우저 기본 동작을 막는다
const GAME_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Shift', 'Control', ' ']);

/** 지금은 키보드 모드로 레이스를 바로 띄운다. 화면 흐름은 Task 13에서 붙인다 */
export function App() {
  const track = useMemo(() => buildTrack(skyway), []);
  const surface = useMemo(() => createRibbonSurface(track), [track]);
  const keys = useMemo(() => createKeyTracker(), []);
  const [result, setResult] = useState<RaceSession | null>(null);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (GAME_KEYS.has(e.key)) e.preventDefault();
      keys.down(e.key);
    };
    const up = (e: KeyboardEvent) => keys.up(e.key);
    const blur = () => keys.blur();
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
    };
  }, [keys]);

  if (result) {
    return (
      <h1>
        {ko.result.finished} {formatRaceTime((result.raceTicks * 1000) / TICK_RATE)}
      </h1>
    );
  }

  return (
    <RaceScreen
      mode="keyboard"
      track={track}
      surface={surface}
      readInput={keys.read}
      isFaceVisible={() => true}
      onFinish={setResult}
    />
  );
}

export default App;

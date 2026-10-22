import { createKeyTracker, DEFAULT_CONTROLS_CONFIG, type SteeringMode, type VisionFrame } from '@winkrider/controls';
import { autopilotInput, createRibbonSurface, TICK_RATE, type KartState } from '@winkrider/kart';
import { buildTrack, skyway } from '@winkrider/track';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { loadAudioSettings, saveAudioSettings, type AudioSettings } from './audio/audio-settings';
import { applyAudioSettings, initAudio, playSfx } from './audio/sfx';
import type { FlowResult } from './calibration/flow';
import { readDebugFlags } from './debug/debug-flags';
import { isMobileDevice } from './device/is-mobile';
import { CameraPreview } from './hud/CameraPreview';
import { createCameraInput, type CameraInput } from './race/camera-input';
import type { InputMode, RaceSession } from './race/session';
import { loadRecord, saveResult, type SaveOutcome } from './records/records';
import { CalibrationScreen } from './screens/CalibrationScreen';
import { MobileNotice } from './screens/MobileNotice';
import { RaceScreen } from './screens/RaceScreen';
import { ResultScreen } from './screens/ResultScreen';
import { StartScreen } from './screens/StartScreen';
import type { CameraErrorKind } from './vision/camera-error';
import { startVision, VisionStartError, type VisionClient } from './vision/vision-client';

// 게임 키는 페이지 스크롤 같은 브라우저 기본 동작을 막는다
const GAME_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Shift', 'Control', ' ']);

type Screen = 'start' | 'calibration' | 'race' | 'result';

const ticksToMs = (ticks: number) => (ticks * 1000) / TICK_RATE;

/** 화면 흐름: 시작 → (카메라) 보정 → 레이스 → 결과 (기획 10.2) */
export function App() {
  const mobile = useMemo(() => isMobileDevice(), []);
  const debug = useMemo(
    () => readDebugFlags(window.location.search, import.meta.env.VITE_ENABLE_DEBUG === 'true'),
    [],
  );
  const track = useMemo(() => buildTrack(debug.laps ? { ...skyway, laps: debug.laps } : skyway), [debug]);
  const surface = useMemo(() => createRibbonSurface(track), [track]);
  const keys = useMemo(() => createKeyTracker(), []);
  const loadBest = useCallback(
    () => ({ camera: loadRecord(track.definition.id, 'camera'), keyboard: loadRecord(track.definition.id, 'keyboard') }),
    [track],
  );

  const [screen, setScreen] = useState<Screen>('start');
  const [mode, setMode] = useState<InputMode>('keyboard');
  const [steering, setSteering] = useState<SteeringMode>('wink');
  const [showPreview, setShowPreview] = useState(true);
  const [loading, setLoading] = useState(false);
  const [cameraError, setCameraError] = useState<CameraErrorKind | 'model-load-failed' | null>(null);
  const [calibration, setCalibration] = useState<FlowResult | null>(null);
  const [result, setResult] = useState<{ session: RaceSession; outcome: SaveOutcome } | null>(null);
  const [raceId, setRaceId] = useState(0);
  const [best, setBest] = useState(loadBest);
  const [audioSettings, setAudioSettings] = useState<AudioSettings>(() => loadAudioSettings());

  const vision = useRef<VisionClient | null>(null);
  const listeners = useRef(new Set<(frame: VisionFrame) => void>());
  const cameraInput = useRef<CameraInput | null>(null);

  const subscribe = useCallback((listener: (frame: VisionFrame) => void) => {
    listeners.current.add(listener);
    return () => {
      listeners.current.delete(listener);
    };
  }, []);

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

  // 앱을 떠나면 카메라를 끈다
  useEffect(() => () => vision.current?.stop(), []);

  // 카메라 모드 레이스 중에는 인식 결과를 주행 입력으로 넘긴다
  useEffect(() => {
    if (screen !== 'race' || mode !== 'camera') return;
    return subscribe((frame) => cameraInput.current?.push(frame));
  }, [screen, mode, raceId, subscribe]);

  const stopVision = () => {
    vision.current?.stop();
    vision.current = null;
  };

  // 브라우저는 클릭 전에는 소리를 막으므로 플레이 버튼을 누를 때 소리를 켠다
  const startAudio = () => {
    initAudio(audioSettings);
    playSfx('uiClick');
  };

  const changeAudio = (settings: AudioSettings) => {
    setAudioSettings(settings);
    saveAudioSettings(settings);
    applyAudioSettings(settings);
  };

  const beginRace = (nextMode: InputMode, cal: FlowResult | null) => {
    cameraInput.current =
      nextMode === 'camera' && cal
        ? createCameraInput(cal.calibration, cal.mode, cal.tiltSign, DEFAULT_CONTROLS_CONFIG)
        : null;
    setMode(nextMode);
    setRaceId((id) => id + 1);
    setScreen('race');
  };

  const playCamera = async () => {
    startAudio();
    setLoading(true);
    setCameraError(null);
    try {
      vision.current ??= await startVision((frame) => listeners.current.forEach((listener) => listener(frame)));
      setMode('camera');
      setScreen('calibration');
    } catch (error) {
      setCameraError(error instanceof VisionStartError ? error.kind : 'unknown');
    } finally {
      setLoading(false);
    }
  };

  const playKeyboard = () => {
    startAudio();
    stopVision();
    setCameraError(null);
    beginRace('keyboard', null);
  };

  const finish = (session: RaceSession) => {
    const outcome = saveResult(
      track.definition.id,
      mode,
      ticksToMs(session.raceTicks),
      session.lapTicks.map(ticksToMs),
    );
    setResult({ session, outcome });
    setScreen('result');
  };

  const home = () => {
    stopVision();
    setBest(loadBest());
    setScreen('start');
  };

  const readInput = useCallback(
    (kart?: KartState) => {
      if (mode === 'camera' && cameraInput.current) return cameraInput.current.read();
      if (debug.autopilot && kart) return autopilotInput(kart, surface);
      return keys.read();
    },
    [mode, keys, debug, surface],
  );
  const isFaceVisible = useCallback(
    () => (mode === 'camera' ? !!cameraInput.current?.isFaceVisible(performance.now()) : true),
    [mode],
  );

  if (mobile) return <MobileNotice />;

  switch (screen) {
    case 'calibration':
      return vision.current ? (
        <CalibrationScreen
          steering={steering}
          video={vision.current.video}
          subscribe={subscribe}
          onDone={(cal) => {
            setCalibration(cal);
            beginRace('camera', cal);
          }}
          onCancel={home}
        />
      ) : null;
    case 'race':
      return (
        <>
          <RaceScreen
            key={raceId}
            mode={mode}
            track={track}
            surface={surface}
            readInput={readInput}
            isFaceVisible={isFaceVisible}
            onFinish={finish}
          />
          {mode === 'camera' && showPreview && vision.current && <CameraPreview video={vision.current.video} />}
        </>
      );
    case 'result':
      return result ? (
        <ResultScreen
          session={result.session}
          mode={mode}
          outcome={result.outcome}
          onRetry={() => beginRace(mode, calibration)}
          onHome={home}
        />
      ) : null;
    default:
      return (
        <StartScreen
          steering={steering}
          showPreview={showPreview}
          loading={loading}
          cameraError={cameraError}
          best={best}
          audio={audioSettings}
          onAudioChange={changeAudio}
          onSteeringChange={setSteering}
          onPreviewChange={setShowPreview}
          onPlayCamera={() => void playCamera()}
          onPlayKeyboard={playKeyboard}
        />
      );
  }
}

export default App;

import type { AudioSettings } from '../audio/audio-settings';
import { formatRaceTime } from '../i18n/format';
import { ko } from '../i18n/ko';
import type { BestRecord } from '../records/records';
import type { CameraErrorKind } from '../vision/camera-error';
import { buttonStyle, screenStyle, secondaryButtonStyle } from './styles';

export interface StartScreenProps {
  showPreview: boolean;
  loading: boolean;
  cameraError: CameraErrorKind | 'model-load-failed' | null;
  best: { camera: BestRecord | null; keyboard: BestRecord | null };
  audio: AudioSettings;
  onAudioChange: (settings: AudioSettings) => void;
  onPreviewChange: (show: boolean) => void;
  onPlayCamera: () => void;
  onPlayKeyboard: () => void;
}

const bestText = (record: BestRecord | null) => (record ? formatRaceTime(record.bestTotalMs) : ko.start.noRecord);

/** 시작 화면: 소개, 조작 방법, 플레이 버튼, 설정, 최고 기록 (기획 10.2) */
export function StartScreen(props: StartScreenProps) {
  const { cameraError } = props;
  return (
    <main style={screenStyle}>
      <h1 style={{ fontSize: 56, margin: 0 }}>{ko.appTitle}</h1>
      <p style={{ margin: 0 }}>{ko.start.tagline}</p>

      <table style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {ko.start.howToHeader.map((h) => (
              <th key={h} style={{ padding: '4px 12px' }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ko.start.howTo.map((row) => (
            <tr key={row[0]}>
              {/* 같은 문구가 두 칸에 올 수 있으므로(엑셀: 자동 / 자동) 칸 위치를 key로 쓴다 */}
              {row.map((cell, i) => (
                <td key={ko.start.howToHeader[i]} style={{ padding: '4px 12px' }}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {cameraError && (
        <p role="alert" style={{ color: '#b42318', fontWeight: 700, margin: 0 }}>
          {ko.cameraError[cameraError]}
        </p>
      )}

      <div style={{ display: 'flex', gap: 12 }}>
        <button style={buttonStyle} onClick={props.onPlayCamera} disabled={props.loading}>
          {cameraError === 'model-load-failed' ? ko.cameraError.retry : ko.start.playCamera}
        </button>
        <button style={secondaryButtonStyle} onClick={props.onPlayKeyboard} disabled={props.loading}>
          {ko.start.playKeyboard}
        </button>
      </div>
      {props.loading && <p style={{ margin: 0 }}>{ko.start.loading}</p>}

      <fieldset style={{ border: 'none', display: 'flex', gap: 16, alignItems: 'center' }}>
        <label>
          <input type="checkbox" checked={props.showPreview} onChange={(e) => props.onPreviewChange(e.target.checked)} />{' '}
          {ko.start.preview}
        </label>
      </fieldset>

      <fieldset style={{ border: 'none', display: 'flex', gap: 16, alignItems: 'center' }}>
        <label>
          <input
            type="checkbox"
            checked={props.audio.muted}
            onChange={(e) => props.onAudioChange({ ...props.audio, muted: e.target.checked })}
          />{' '}
          {ko.start.mute}
        </label>
        <label>
          {ko.start.volume}{' '}
          <input
            type="range"
            min={0}
            max={1}
            step={0.1}
            value={props.audio.volume}
            onChange={(e) => props.onAudioChange({ ...props.audio, volume: Number(e.target.value) })}
          />
        </label>
      </fieldset>

      <p style={{ margin: 0 }}>
        {ko.start.best} · {ko.start.bestCamera} {bestText(props.best.camera)} · {ko.start.bestKeyboard}{' '}
        {bestText(props.best.keyboard)}
      </p>
      <p style={{ margin: 0, fontSize: 14, opacity: 0.7 }}>
        {ko.start.privacy} {ko.start.disclaimer}
      </p>
    </main>
  );
}

import type { ControlInput } from '@winkrider/kart';
import type { CSSProperties } from 'react';

import { ko } from '../i18n/ko';

const cell = (active: boolean): CSSProperties => ({
  padding: '4px 10px',
  borderRadius: 6,
  background: active ? '#ffd23f' : 'rgba(255,255,255,0.15)',
  color: active ? '#1a1a1a' : '#fff',
  fontWeight: 700,
});

/** 지금 인식된 조작. 조작이 안 먹을 때 원인을 알 수 있게 보여 준다 (기획 10.3) */
export function InputIndicator({ input }: { input: ControlInput }) {
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      <span style={cell(input.steer < -0.05)}>{ko.input.left}</span>
      <span style={cell(input.steer > 0.05)}>{ko.input.right}</span>
      <span style={{ ...cell(input.throttle > 0.05), minWidth: 64 }}>
        {ko.input.throttle} {Math.round(input.throttle * 100)}%
      </span>
      <span style={cell(input.drift)}>{ko.input.drift}</span>
      <span style={cell(input.boost)}>{ko.input.boost}</span>
    </div>
  );
}

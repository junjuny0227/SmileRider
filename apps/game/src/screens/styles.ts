import type { CSSProperties } from 'react';

/** 레이스가 아닌 화면들이 같이 쓰는 기본 배치 */
export const screenStyle: CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 16,
  padding: 24,
  boxSizing: 'border-box',
  background: 'linear-gradient(#9fd3ff, #e8f6ff)',
  color: '#1a1a1a',
  fontFamily: 'system-ui, sans-serif',
  textAlign: 'center',
};

export const buttonStyle: CSSProperties = {
  padding: '12px 24px',
  fontSize: 18,
  fontWeight: 700,
  border: 'none',
  borderRadius: 10,
  background: '#e5484d',
  color: '#fff',
  cursor: 'pointer',
};

export const secondaryButtonStyle: CSSProperties = { ...buttonStyle, background: '#3a3f4b' };

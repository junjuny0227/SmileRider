import { Component, type ReactNode } from 'react';

interface Props {
  /** 모델을 불러오지 못했을 때 대신 그릴 것. null이면 그 부분만 비운다 */
  fallback: ReactNode;
  children: ReactNode;
}

/**
 * useGLTF는 모델을 불러오지 못하면 오류를 던지는데, Suspense는 이를 잡지 못해 앱 전체가 멈춘다.
 * 모델 하나가 실패해도 레이스는 계속되도록 그 부분만 대체 화면으로 바꾼다.
 */
export class ModelErrorBoundary extends Component<Props, { failed: boolean }> {
  override state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

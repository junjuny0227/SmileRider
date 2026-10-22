import { render, screen } from '@testing-library/react';

import { ModelErrorBoundary } from './ModelErrorBoundary';

function FailingModel(): never {
  throw new Error('Could not load /models3d/kart-oopi.glb: Failed to fetch');
}

describe('ModelErrorBoundary', () => {
  beforeEach(() => {
    // React가 잡힌 오류도 콘솔에 남기므로 테스트 출력에서는 숨긴다
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  it('모델 로딩이 실패하면 앱을 멈추지 않고 대체 화면을 보여 준다', () => {
    render(
      <div>
        <p>레이스 계속</p>
        <ModelErrorBoundary fallback={<span>대체 상자</span>}>
          <FailingModel />
        </ModelErrorBoundary>
      </div>,
    );
    expect(screen.getByText('대체 상자')).toBeTruthy();
    expect(screen.getByText('레이스 계속')).toBeTruthy();
  });

  it('대체 화면이 없으면 그 부분만 비운다 (배경 소품)', () => {
    const { container } = render(
      <ModelErrorBoundary fallback={null}>
        <FailingModel />
      </ModelErrorBoundary>,
    );
    expect(container.innerHTML).toBe('');
  });

  it('오류가 없으면 그대로 그린다', () => {
    render(
      <ModelErrorBoundary fallback={<span>대체 상자</span>}>
        <span>카트 모델</span>
      </ModelErrorBoundary>,
    );
    expect(screen.getByText('카트 모델')).toBeTruthy();
  });
});

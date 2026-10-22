import { act, fireEvent, render, screen } from '@testing-library/react';

import App from './App';
import { isMobileDevice } from './device/is-mobile';
import type { RaceSession } from './race/session';
import type { RaceScreenProps } from './screens/RaceScreen';
import { startVision, VisionStartError } from './vision/vision-client';

// 테스트 환경(jsdom)에는 WebGL과 카메라가 없으므로 레이스 화면과 인식 시작은 가짜로 바꾼다
let captured: RaceScreenProps | null = null;
vi.mock('./screens/RaceScreen', () => ({
  RaceScreen: (props: RaceScreenProps) => {
    captured = props;
    return <div>race</div>;
  },
}));
vi.mock('./vision/vision-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./vision/vision-client')>()),
  startVision: vi.fn(),
}));
vi.mock('./device/is-mobile', () => ({ isMobileDevice: vi.fn(() => false) }));

const finished = { raceTicks: 6376, lapTicks: [3200, 3176] } as RaceSession;

describe('App', () => {
  beforeEach(() => {
    captured = null;
    window.localStorage.clear();
    vi.mocked(isMobileDevice).mockReturnValue(false);
  });

  it('시작 화면에 게임 이름과 플레이 버튼을 보여 준다', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'WinkRider' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '카메라로 플레이' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '키보드로 플레이' })).toBeTruthy();
  });

  it('키보드로 플레이하면 키 입력을 레이스 화면에 전달하고, 포커스를 잃으면 키가 풀린다', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '키보드로 플레이' }));
    expect(captured?.mode).toBe('keyboard');
    expect(captured?.isFaceVisible()).toBe(true);
    fireEvent.keyDown(window, { key: 'ArrowUp' });
    expect(captured?.readInput().throttle).toBe(1);
    fireEvent.blur(window);
    expect(captured?.readInput().throttle).toBe(0);
  });

  it('완주하면 결과 화면, 다시 하기는 바로 레이스, 처음으로는 시작 화면', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '키보드로 플레이' }));
    act(() => captured?.onFinish(finished));
    expect(screen.getByText('완주!')).toBeTruthy();
    expect(screen.getByText('1:46.26')).toBeTruthy();
    expect(screen.getByText('키보드 기록')).toBeTruthy();
    expect(screen.getAllByText('최고 기록!').length).toBeGreaterThan(0);

    captured = null;
    fireEvent.click(screen.getByRole('button', { name: '다시 하기' }));
    expect(captured).not.toBeNull();
    act(() => captured?.onFinish(finished));
    fireEvent.click(screen.getByRole('button', { name: '처음으로' }));
    expect(screen.getByRole('button', { name: '카메라로 플레이' })).toBeTruthy();
  });

  it('게임 키의 브라우저 기본 동작은 레이스 중에만 막는다 (시작 화면에서는 방향키·Space로 설정을 조작)', () => {
    render(<App />);
    // fireEvent는 preventDefault되면 false를 돌려준다
    expect(fireEvent.keyDown(window, { key: 'ArrowRight' })).toBe(true);
    expect(fireEvent.keyDown(window, { key: ' ' })).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: '키보드로 플레이' }));
    expect(fireEvent.keyDown(window, { key: 'ArrowRight' })).toBe(false);
  });

  it('카메라 권한을 거부하면 안내와 키보드 플레이 버튼을 보여 준다', async () => {
    vi.mocked(startVision).mockRejectedValueOnce(new VisionStartError('permission-denied'));
    render(<App />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '카메라로 플레이' }));
    });
    expect(screen.getByText(/카메라 권한이 거부됐어요/)).toBeTruthy();
    expect(screen.getByRole('button', { name: '키보드로 플레이' })).toBeTruthy();
  });

  it('휴대폰이면 PC에서 플레이하라고 안내한다', () => {
    vi.mocked(isMobileDevice).mockReturnValue(true);
    render(<App />);
    expect(screen.getByText('PC에서 플레이해 주세요')).toBeTruthy();
    expect(screen.queryByRole('button', { name: '카메라로 플레이' })).toBeNull();
  });
});

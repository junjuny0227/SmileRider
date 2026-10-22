import { act, fireEvent, render } from '@testing-library/react';

import App from './App';
import type { RaceSession } from './race/session';
import type { RaceScreenProps } from './screens/RaceScreen';

// 테스트 환경(jsdom)에는 WebGL이 없어 3D 장면을 그릴 수 없으므로, 레이스 화면은 받은 props만 기록한다
let captured: RaceScreenProps | null = null;
vi.mock('./screens/RaceScreen', () => ({
  RaceScreen: (props: RaceScreenProps) => {
    captured = props;
    return <div>race</div>;
  },
}));

describe('App', () => {
  beforeEach(() => {
    captured = null;
  });

  it('키보드 모드로 레이스 화면을 띄우고 키 입력을 전달한다', () => {
    render(<App />);
    expect(captured?.mode).toBe('keyboard');
    expect(captured?.isFaceVisible()).toBe(true);
    fireEvent.keyDown(window, { key: 'ArrowUp' });
    expect(captured?.readInput().throttle).toBe(1);
    fireEvent.blur(window);
    expect(captured?.readInput().throttle).toBe(0);
  });

  it('완주하면 기록을 보여 준다', () => {
    const { getByText } = render(<App />);
    act(() => captured?.onFinish({ raceTicks: 6376, lapTicks: [3200, 3176] } as RaceSession));
    expect(getByText(/완주!/)).toBeTruthy();
    expect(getByText(/1:46\.26/)).toBeTruthy();
  });
});

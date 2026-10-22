import { createKeyTracker } from './keyboard.js';

describe('createKeyTracker', () => {
  it('아무 키도 누르지 않으면 입력 없음', () => {
    expect(createKeyTracker().read()).toEqual({ steer: 0, throttle: 0, drift: false, boost: false });
  });

  it('↑는 throttle 1, ←는 steer -1, →는 steer 1, 둘 다 누르면 0', () => {
    const keys = createKeyTracker();
    keys.down('ArrowUp');
    expect(keys.read().throttle).toBe(1);
    keys.down('ArrowLeft');
    expect(keys.read().steer).toBe(-1);
    keys.down('ArrowRight');
    expect(keys.read().steer).toBe(0);
    keys.up('ArrowLeft');
    expect(keys.read().steer).toBe(1);
  });

  it('Shift를 누르고 있는 동안 drift', () => {
    const keys = createKeyTracker();
    keys.down('Shift');
    expect(keys.read().drift).toBe(true);
    expect(keys.read().drift).toBe(true);
    keys.up('Shift');
    expect(keys.read().drift).toBe(false);
  });

  it('Ctrl을 계속 누르고 있어도 boost는 첫 read에서만 true', () => {
    const keys = createKeyTracker();
    keys.down('Control');
    keys.down('Control'); // 키 반복 입력
    expect(keys.read().boost).toBe(true);
    expect(keys.read().boost).toBe(false);
    keys.up('Control');
    keys.down('Control');
    expect(keys.read().boost).toBe(true);
  });

  it('blur()하면 모든 키가 떼어진 상태가 된다', () => {
    const keys = createKeyTracker();
    keys.down('ArrowUp');
    keys.down('ArrowLeft');
    keys.down('Shift');
    keys.down('Control');
    keys.blur();
    expect(keys.read()).toEqual({ steer: 0, throttle: 0, drift: false, boost: false });
  });
});

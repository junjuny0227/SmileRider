import { formatRaceTime, formatSpeed } from './format';

describe('formatRaceTime', () => {
  it('분:초.백분의 일초로 표시한다', () => {
    expect(formatRaceTime(0)).toBe('0:00.00');
    expect(formatRaceTime(53_420)).toBe('0:53.42');
    expect(formatRaceTime(106_316)).toBe('1:46.31');
  });

  it('음수는 0으로 본다', () => {
    expect(formatRaceTime(-5)).toBe('0:00.00');
  });
});

describe('formatSpeed', () => {
  it('m/s를 km/h 정수로 바꾼다', () => {
    expect(formatSpeed(30)).toBe('108');
    expect(formatSpeed(41.99)).toBe('151');
  });
});

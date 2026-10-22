const twoDigits = new Intl.NumberFormat('ko-KR', { minimumIntegerDigits: 2, useGrouping: false });
const integer = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0, useGrouping: false });

/** 기록 시간을 "분:초.백분의 일초"로 표시한다 (예: 1:46.31) */
export function formatRaceTime(ms: number): string {
  const centiseconds = Math.floor(Math.max(0, ms) / 10);
  const minutes = Math.floor(centiseconds / 6000);
  const seconds = Math.floor(centiseconds / 100) % 60;
  return `${minutes}:${twoDigits.format(seconds)}.${twoDigits.format(centiseconds % 100)}`;
}

/** m/s를 km/h 정수로 표시한다 */
export function formatSpeed(metersPerSecond: number): string {
  return integer.format(metersPerSecond * 3.6);
}

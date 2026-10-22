import { buildTrack } from './build-track.js';
import { createRaceProgress, updateRaceProgress, type RaceProgress } from './race-progress.js';
import { circle } from './test-utils/fixtures.js';

const track = buildTrack(circle); // checkpoints [0.25, 0.5, 0.75], laps 2
const L = track.length;

// s를 1m씩 바꿔 가며 진행 상황을 갱신한다. fromS, toS는 감싸지 않은 값
function drive(progress: RaceProgress, fromS: number, toS: number): RaceProgress {
  const step = toS >= fromS ? 1 : -1;
  let p = progress;
  for (let s = fromS + step; step > 0 ? s <= toS : s >= toS; s += step) {
    p = updateRaceProgress(track, p, ((s % L) + L) % L);
  }
  return updateRaceProgress(track, p, ((toS % L) + L) % L);
}

describe('updateRaceProgress', () => {
  it('처음에는 0랩, 첫 체크포인트를 기다린다', () => {
    const p = createRaceProgress(track);
    expect(p).toMatchObject({ completedLaps: 0, nextCheckpoint: 0, lastS: 0, wrongWay: false, finished: false });
  });

  it('체크포인트를 순서대로 다 지나고 출발선을 넘으면 1랩', () => {
    const p = drive(createRaceProgress(track), 0, L + 1);
    expect(p.completedLaps).toBe(1);
    expect(p.nextCheckpoint).toBe(0);
  });

  it('체크포인트를 건너뛰면 랩으로 인정하지 않는다', () => {
    let p = drive(createRaceProgress(track), 0, -5);
    p = drive(p, -5, 5);
    expect(p.completedLaps).toBe(0);
  });

  it('2랩을 마치면 finished', () => {
    const p = drive(createRaceProgress(track), 0, 2 * L + 1);
    expect(p.completedLaps).toBe(2);
    expect(p.finished).toBe(true);
  });

  it('10m 넘게 거꾸로 가면 wrongWay, 다시 앞으로 가면 풀린다', () => {
    let p = drive(createRaceProgress(track), 0, 100);
    p = drive(p, 100, 89);
    expect(p.wrongWay).toBe(true);
    p = drive(p, 89, 92);
    expect(p.wrongWay).toBe(false);
    expect(p.reverseDistance).toBe(0);
  });

  it('10m 이하로 거꾸로 가면 wrongWay가 아니다', () => {
    let p = drive(createRaceProgress(track), 0, 100);
    p = drive(p, 100, 92);
    expect(p.wrongWay).toBe(false);
  });

  it('거꾸로 가서 체크포인트를 다시 지나도 중복 인정되지 않는다', () => {
    const cp = 0.25 * L;
    let p = drive(createRaceProgress(track), 0, cp + 5);
    expect(p.nextCheckpoint).toBe(1);
    p = drive(p, cp + 5, cp - 5);
    p = drive(p, cp - 5, cp + 5);
    expect(p.nextCheckpoint).toBe(1);
  });

  it('입력 객체를 바꾸지 않는다', () => {
    const p = createRaceProgress(track);
    updateRaceProgress(track, p, 50);
    expect(p.lastS).toBe(0);
  });
});

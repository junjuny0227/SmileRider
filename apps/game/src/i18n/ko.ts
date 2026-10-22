/** 화면에 보이는 문구는 모두 여기에 둔다. 첫 출시는 한국어만 지원한다 (기획 10.10) */
export const ko = {
  appTitle: 'WinkRider',
  hud: {
    speedUnit: 'km/h',
    lap: (current: number, total: number) => `랩 ${current}/${total}`,
    lapTime: '현재 랩',
    totalTime: '전체',
    boosters: '부스터',
    wrongWay: '역주행!',
    go: 'GO!',
    faceLost: '얼굴이 보이지 않아요',
    faceLostHint: '카메라에 얼굴이 보이게 해 주세요',
  },
  input: {
    left: '◀',
    right: '▶',
    throttle: '엑셀',
    drift: '드리프트',
    boost: '부스트',
  },
  result: {
    finished: '완주!',
  },
};

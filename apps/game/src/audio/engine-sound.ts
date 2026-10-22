/** 속도 비율(속도 / 최고 속도)에 따른 엔진음 높이. 부스트 중에는 1.2배 */
export function enginePitchHz(speedRatio: number, boosting: boolean): number {
  return (60 + 140 * speedRatio) * (boosting ? 1.2 : 1);
}

/** 엑셀에 따른 엔진음 크기 */
export function engineGain(throttle: number): number {
  return 0.15 + 0.1 * throttle;
}

// 값이 바뀔 때 튀지 않도록 따라가는 시간 상수(s)
const SMOOTH = 0.05;

/** 톱니파와 사각파를 저역 통과 필터에 통과시킨 엔진음. 녹음 없이 속도에 따라 계속 바뀐다 (기획 7장 사운드) */
export function createEngineSound(ctx: AudioContext, out: AudioNode) {
  const low = ctx.createOscillator();
  const high = ctx.createOscillator();
  low.type = 'sawtooth';
  high.type = 'square';
  high.detune.value = 700;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 900;
  const gain = ctx.createGain();
  gain.gain.value = 0;
  low.connect(filter);
  high.connect(filter);
  filter.connect(gain);
  gain.connect(out);
  low.start();
  high.start();

  return {
    update(speedRatio: number, throttle: number, boosting: boolean) {
      const pitch = enginePitchHz(speedRatio, boosting);
      low.frequency.setTargetAtTime(pitch, ctx.currentTime, SMOOTH);
      high.frequency.setTargetAtTime(pitch / 2, ctx.currentTime, SMOOTH);
      gain.gain.setTargetAtTime(engineGain(throttle), ctx.currentTime, SMOOTH);
    },
    stop() {
      low.stop();
      high.stop();
      gain.disconnect();
    },
  };
}

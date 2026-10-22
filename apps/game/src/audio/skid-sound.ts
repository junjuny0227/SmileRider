const SMOOTH = 0.05;

/** 노이즈를 1.2kHz 대역 통과 필터에 통과시킨 타이어 마찰음. 음량은 0.2 × 세기 (기획 7장 사운드) */
export function createSkidSound(ctx: AudioContext, out: AudioNode) {
  const noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const source = ctx.createBufferSource();
  source.buffer = noise;
  source.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 1200;
  const gain = ctx.createGain();
  gain.gain.value = 0;
  source.connect(filter);
  filter.connect(gain);
  gain.connect(out);
  source.start();

  return {
    update(intensity: number) {
      gain.gain.setTargetAtTime(0.2 * Math.min(1, Math.max(0, intensity)), ctx.currentTime, SMOOTH);
    },
    stop() {
      source.stop();
      gain.disconnect();
    },
  };
}

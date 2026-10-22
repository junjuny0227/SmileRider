import type { AudioSettings } from './audio-settings';

export type SfxName = 'countdownBeep' | 'countdownGo' | 'boosterGained' | 'boost' | 'wallHit' | 'uiClick' | 'finish';

// ZzFX 효과음 값 (volume, randomness, frequency, attack, sustain, release, shape, shapeCurve, slide, deltaSlide, pitchJump, pitchJumpTime, repeatTime, noise)
const ZZFX_SOUNDS: Partial<Record<SfxName, (number | undefined)[]>> = {
  countdownBeep: [1, 0, 660, 0.01, 0.08, 0.08, 1],
  boosterGained: [1, 0, 523, 0.01, 0.05, 0.2, 1, 1, 0, 0, 523, 0.05],
  boost: [1.2, 0.05, 120, 0.02, 0.3, 0.4, 3, 1, 8, 0, 0, 0, 0, 0.3],
};

// Kenney CC0 음원 (CREDITS.md)
const SAMPLE_FILES: Partial<Record<SfxName, string>> = {
  countdownGo: '/sounds/go.ogg',
  wallHit: '/sounds/wall-hit.ogg',
  uiClick: '/sounds/ui-click.ogg',
  finish: '/sounds/finish.ogg',
};

export interface GameAudio {
  ctx: AudioContext;
  /** 모든 소리가 지나가는 음량 조절 노드 */
  master: GainNode;
  buffers: Map<SfxName, AudioBuffer>;
}

let audio: GameAudio | null = null;

async function loadBuffers(target: GameAudio) {
  // ZzFX는 불러올 때 자체 AudioContext를 만들므로, 소리를 켤 때 동적으로 불러와 샘플만 만든다
  const { ZZFX } = await import('zzfx');
  for (const [name, params] of Object.entries(ZZFX_SOUNDS) as [SfxName, (number | undefined)[]][]) {
    const samples = ZZFX.buildSamples(...params);
    const buffer = target.ctx.createBuffer(1, samples.length, ZZFX.sampleRate);
    buffer.copyToChannel(Float32Array.from(samples), 0);
    target.buffers.set(name, buffer);
  }
  await Promise.all(
    (Object.entries(SAMPLE_FILES) as [SfxName, string][]).map(async ([name, url]) => {
      try {
        const response = await fetch(url);
        target.buffers.set(name, await target.ctx.decodeAudioData(await response.arrayBuffer()));
      } catch {
        // 소리 하나를 불러오지 못해도 게임은 계속한다
      }
    }),
  );
}

/**
 * 소리를 켠다. 브라우저는 사용자가 클릭하기 전에는 소리를 막으므로 플레이 버튼을 누를 때 부른다 (기획 7장 사운드).
 * AudioContext가 없는 환경(테스트)에서는 null을 돌려준다.
 */
export function initAudio(settings: AudioSettings): GameAudio | null {
  if (audio) {
    void audio.ctx.resume();
    applyAudioSettings(settings);
    return audio;
  }
  if (typeof AudioContext === 'undefined') return null;
  const ctx = new AudioContext();
  const master = ctx.createGain();
  master.connect(ctx.destination);
  audio = { ctx, master, buffers: new Map() };
  applyAudioSettings(settings);
  void loadBuffers(audio);
  return audio;
}

export function getAudio(): GameAudio | null {
  return audio;
}

export function applyAudioSettings(settings: AudioSettings): void {
  if (audio) audio.master.gain.value = settings.muted ? 0 : settings.volume;
}

export function playSfx(name: SfxName): void {
  const buffer = audio?.buffers.get(name);
  if (!audio || !buffer) return;
  const source = audio.ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(audio.master);
  source.start();
}

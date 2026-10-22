// zzfx 패키지는 타입 선언을 함께 배포하지 않아, 이 게임이 쓰는 부분만 선언한다
declare module 'zzfx' {
  export const ZZFX: {
    sampleRate: number;
    buildSamples(...parameters: (number | undefined)[]): number[];
  };
}

import { toFaceFrame } from './face-frame';

describe('toFaceFrame', () => {
  it('categories가 없으면 null (얼굴을 찾지 못함)', () => {
    expect(toFaceFrame(undefined, undefined)).toBeNull();
  });

  it('mouthSmile은 좌우 평균, 행렬이 없으면 기울기 0', () => {
    const frame = toFaceFrame(
      [
        { categoryName: 'jawOpen', score: 0.5 },
        { categoryName: 'mouthSmileLeft', score: 0.8 },
        { categoryName: 'mouthSmileRight', score: 0.6 },
      ],
      undefined,
    );
    expect(frame?.blendshapes.jawOpen).toBe(0.5);
    expect(frame?.blendshapes.mouthSmile).toBeCloseTo(0.7, 6);
    expect(frame?.headRollDeg).toBe(0);
  });

  it('없는 표정 수치는 0', () => {
    expect(toFaceFrame([], undefined)?.blendshapes).toEqual({ jawOpen: 0, mouthSmile: 0 });
  });

  it('행렬이 있으면 headRollDegFromMatrix로 기울기를 읽는다', () => {
    const c = Math.cos(Math.PI / 6);
    const s = Math.sin(Math.PI / 6);
    const m = [c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
    expect(toFaceFrame([], m)?.headRollDeg).toBeCloseTo(30, 6);
  });
});

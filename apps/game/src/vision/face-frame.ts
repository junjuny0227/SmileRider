import type { FaceFrame } from '@smilerider/controls';

import { headRollDegFromMatrix } from './head-roll';

/** FaceLandmarker 결과(표정 수치, 변환 행렬)를 조작 판정용 값으로 바꾼다. 얼굴이 없으면 null */
export function toFaceFrame(
  categories: { categoryName: string; score: number }[] | undefined,
  matrix: ArrayLike<number> | undefined,
): FaceFrame | null {
  if (!categories) return null;
  const score = (name: string) => categories.find((c) => c.categoryName === name)?.score ?? 0;
  return {
    blendshapes: {
      jawOpen: score('jawOpen'),
      mouthSmile: (score('mouthSmileLeft') + score('mouthSmileRight')) / 2,
    },
    headRollDeg: matrix ? headRollDegFromMatrix(matrix) : 0,
  };
}

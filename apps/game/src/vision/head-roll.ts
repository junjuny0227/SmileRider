/** 4x4 열 우선 행렬에서 Z축 회전 각도(도)를 읽는다. 방향 부호는 보정 단계에서 tiltSign으로 맞춘다 */
export function headRollDegFromMatrix(matrix: ArrayLike<number>): number {
  return (Math.atan2(matrix[1], matrix[0]) * 180) / Math.PI;
}

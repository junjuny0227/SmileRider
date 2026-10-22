export interface DebugFlags {
  /** 키보드 모드에서 자동 주행으로 운전한다 (E2E용) */
  autopilot: boolean;
  /** 트랙의 랩 수를 바꾼다 (E2E용) */
  laps: number | null;
}

/**
 * 디버그 빌드(VITE_ENABLE_DEBUG=true)에서만 주소 옵션 ?debug=autopilot, ?laps=를 읽는다.
 * 배포 빌드에서는 enabled가 false라 모두 무시한다.
 */
export function readDebugFlags(search: string, enabled: boolean): DebugFlags {
  if (!enabled) return { autopilot: false, laps: null };
  const params = new URLSearchParams(search);
  const laps = Number(params.get('laps'));
  return {
    autopilot: params.get('debug') === 'autopilot',
    laps: Number.isInteger(laps) && laps >= 1 ? laps : null,
  };
}

import { useEffect, useRef } from 'react';

/**
 * 카메라 영상을 화면 구석에 거울처럼 작게 보여 준다 (기획 10.3).
 * 인식용 video를 옮기면 그 video가 문서에서 떨어져 멈출 수 있으므로, 같은 스트림을 자기 video로 따로 재생한다.
 */
export function CameraPreview({ stream }: { stream: MediaStream }) {
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const element = video.current;
    if (!element) return;
    element.srcObject = stream;
    void Promise.resolve(element.play?.()).catch(() => undefined);
  }, [stream]);

  return (
    <div
      style={{ position: 'fixed', top: 16, right: 16, width: 200, zIndex: 10, boxShadow: '0 2px 12px rgba(0,0,0,0.4)', borderRadius: 8 }}
    >
      <video
        ref={video}
        muted
        playsInline
        autoPlay
        style={{ width: '100%', display: 'block', transform: 'scaleX(-1)', borderRadius: 8 }}
      />
    </div>
  );
}

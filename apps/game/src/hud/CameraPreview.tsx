import { useEffect, useRef } from 'react';

/** 카메라 영상을 화면 구석에 거울처럼 작게 보여 준다 (기획 10.3) */
export function CameraPreview({ video }: { video: HTMLVideoElement }) {
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const box = container.current;
    if (!box) return;
    Object.assign(video.style, { width: '100%', display: 'block', transform: 'scaleX(-1)', borderRadius: '8px' });
    box.appendChild(video);
    void video.play().catch(() => undefined);
    return () => {
      if (video.parentElement === box) box.removeChild(video);
    };
  }, [video]);

  return (
    <div
      ref={container}
      style={{ position: 'fixed', top: 16, right: 16, width: 200, zIndex: 10, boxShadow: '0 2px 12px rgba(0,0,0,0.4)', borderRadius: 8 }}
    />
  );
}

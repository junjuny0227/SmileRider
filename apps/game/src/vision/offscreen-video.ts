/**
 * 인식용 video를 화면 밖에 붙여 둔다. 문서에서 떨어진 media 요소는 브라우저가 자동으로 멈추므로,
 * 화면 구성이 바뀌어도 새 카메라 프레임(requestVideoFrameCallback)이 계속 들어오게 한다.
 * 숨길 때 display: none을 쓰면 일부 브라우저가 프레임 갱신을 멈추므로 투명한 1px로 둔다.
 */
export function mountOffscreen(video: HTMLVideoElement): () => void {
  Object.assign(video.style, {
    position: 'fixed',
    left: '-10000px',
    top: '0',
    width: '1px',
    height: '1px',
    opacity: '0',
    pointerEvents: 'none',
  });
  document.body.appendChild(video);
  return () => video.remove();
}

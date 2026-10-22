import { mountOffscreen } from './offscreen-video';

describe('mountOffscreen', () => {
  it('인식용 video를 문서에 붙여 두되 화면에는 보이지 않게 한다 (문서에서 떨어진 video는 브라우저가 멈춤)', () => {
    const video = document.createElement('video');
    const unmount = mountOffscreen(video);
    expect(video.isConnected).toBe(true);
    expect(video.style.display).not.toBe('none');
    expect(video.style.opacity).toBe('0');
    unmount();
    expect(video.isConnected).toBe(false);
  });
});

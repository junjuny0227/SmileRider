import { render } from '@testing-library/react';

import { CameraPreview } from './CameraPreview';

describe('CameraPreview', () => {
  it('인식용 video를 옮기지 않고, 같은 카메라 스트림을 자기 video로 보여 준다', () => {
    const stream = {} as MediaStream;
    const recognition = document.createElement('video');
    document.body.appendChild(recognition);

    const { container, unmount } = render(<CameraPreview stream={stream} />);
    const preview = container.querySelector('video');
    expect(preview).not.toBeNull();
    expect(preview).not.toBe(recognition);
    expect(preview?.srcObject).toBe(stream);

    unmount();
    // 미리보기가 사라져도 인식용 video는 문서에 남아 계속 재생된다
    expect(recognition.isConnected).toBe(true);
  });
});

import { render } from '@testing-library/react';

import { DEFAULT_AUDIO_SETTINGS } from '../audio/audio-settings';
import { StartScreen } from './StartScreen';

describe('StartScreen', () => {
  it('조작 표에 같은 문구가 두 칸에 있어도(엑셀 자동 / 자동) React key 경고가 나지 않는다', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(
      <StartScreen
        showPreview={false}
        loading={false}
        cameraError={null}
        best={{ camera: null, keyboard: null }}
        audio={DEFAULT_AUDIO_SETTINGS}
        onAudioChange={() => undefined}
        onPreviewChange={() => undefined}
        onPlayCamera={() => undefined}
        onPlayKeyboard={() => undefined}
      />,
    );
    expect(error).not.toHaveBeenCalled();
    error.mockRestore();
  });
});

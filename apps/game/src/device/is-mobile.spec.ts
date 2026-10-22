import { isMobileDevice } from './is-mobile';

const IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const ANDROID_PHONE =
  'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Mobile Safari/537.36';
const MAC_CHROME =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36';

describe('isMobileDevice', () => {
  it('userAgentData.mobile이 있으면 그 값을 따른다', () => {
    expect(isMobileDevice({ userAgent: MAC_CHROME, userAgentData: { mobile: true } })).toBe(true);
    expect(isMobileDevice({ userAgent: IPHONE, userAgentData: { mobile: false } })).toBe(false);
  });

  it('iPhone, Android 휴대폰 UA는 모바일', () => {
    expect(isMobileDevice({ userAgent: IPHONE })).toBe(true);
    expect(isMobileDevice({ userAgent: ANDROID_PHONE })).toBe(true);
  });

  it('Mac Chrome UA는 모바일이 아니다', () => {
    expect(isMobileDevice({ userAgent: MAC_CHROME })).toBe(false);
  });
});

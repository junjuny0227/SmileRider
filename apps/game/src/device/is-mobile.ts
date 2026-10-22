interface NavigatorLike {
  userAgent: string;
  userAgentData?: { mobile: boolean };
}

/** 휴대폰이면 true. 첫 출시는 PC 브라우저만 지원한다 (기획 10.11) */
export function isMobileDevice(nav: NavigatorLike = navigator as NavigatorLike): boolean {
  if (nav.userAgentData) return nav.userAgentData.mobile;
  return /iPhone|iPod|Android.+Mobile|Windows Phone/i.test(nav.userAgent);
}

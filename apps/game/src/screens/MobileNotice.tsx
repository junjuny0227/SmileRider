import { ko } from '../i18n/ko';
import { screenStyle } from './styles';

/** 휴대폰으로 접속했을 때 (기획 10.11) */
export function MobileNotice() {
  return (
    <main style={screenStyle}>
      <h1>{ko.appTitle}</h1>
      <h2>{ko.mobile.title}</h2>
      <p>{ko.mobile.body}</p>
    </main>
  );
}

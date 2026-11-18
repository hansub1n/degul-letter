// 구글은 앱 안 브라우저(웹뷰)에서 OAuth를 막는다. 카카오 로그인은 카카오톡 안에서도 된다.
// 구글 단추만 이 판별로 외부 브라우저를 열거나, 열 수 없으면 안내를 보여 준다.

export type InAppKind = "kakaotalk" | "android" | "ios";

const NAMED_IN_APP = /Instagram|FBAN|FBAV|FB_IAB|FB4A|Line\/|NAVER\(|DaumApps/i;
const ANDROID_WEBVIEW = /; wv[;)]/;

/** 일반 브라우저(사파리, 크롬, 삼성 인터넷 등)면 null */
export function detectInApp(ua: string): InAppKind | null {
  if (/KAKAOTALK/i.test(ua)) return "kakaotalk";
  const named = NAMED_IN_APP.test(ua);
  const androidWebView = ANDROID_WEBVIEW.test(ua);
  if (!named && !androidWebView) return null;
  if (/Android/i.test(ua)) return "android";
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  // 데스크톱에 붙은 인앱은 드물다. 구글이 막을 수 있으니 안내 쪽으로 보낸다.
  return named ? "ios" : null;
}

/**
 * 지금 페이지를 바깥 브라우저로 연다.
 * 카카오톡은 kakaotalk://web/openExternal, 그 밖 안드로이드 인앱은 intent:// (크롬).
 * iOS의 카카오톡이 아닌 인앱은 이 주소로 나갈 수 없다.
 */
export function externalBrowserUrl(pageUrl: string, kind: "kakaotalk" | "android"): string {
  const clean = new URL(pageUrl);
  clean.hash = "";
  const href = clean.toString();
  if (kind === "kakaotalk") {
    return `kakaotalk://web/openExternal?url=${encodeURIComponent(href)}`;
  }
  const stripped = href.replace(/^https?:\/\//, "");
  return `intent://${stripped}#Intent;scheme=https;action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(href)};end`;
}

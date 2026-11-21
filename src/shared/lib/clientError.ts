// 브라우저에서 난 오류를 짧게 정리해서 우리 서버(/api/client-error)에 남긴다.
// 친구 휴대폰에서만 나는 오류도 나중에 볼 수 있게 하려는 것. 닉네임·편지 내용은 보내지 않는다.
// 오류와 함께 그 순간의 상태(로그인이 살아 있는지, 쿠키·저장소를 쓸 수 있는지, 앱 안 브라우저인지)를 보낸다.

import { AppwriteException } from "appwrite";
import { getAppwrite } from "./appwrite";

export type ErrorInfo = {
  /** 화면에 보일 짧은 번호. Appwrite는 HTTP 코드, 서버까지 못 가면 "net" */
  code: string;
  /** Appwrite 오류 종류 (예: user_unauthorized) */
  type: string;
  message: string;
  /** 서버까지 못 간 오류 (인터넷 연결, 브라우저가 막은 요청) */
  network: boolean;
};

export type ErrorContext = Record<string, string | number | boolean>;

export function describeError(e: unknown): ErrorInfo {
  if (e instanceof AppwriteException) {
    // code 0은 응답을 못 받은 경우 (연결 끊김, 브라우저가 막음)
    return { code: e.code ? String(e.code) : "net", type: e.type ?? "", message: e.message, network: !e.code };
  }
  if (e instanceof TypeError) {
    // fetch가 서버에 닿지 못하면 TypeError ("Load failed", "Failed to fetch")
    return { code: "net", type: "TypeError", message: e.message, network: true };
  }
  if (e instanceof Error) return { code: "app", type: e.name, message: e.message, network: false };
  return { code: "app", type: typeof e, message: String(e), network: false };
}

/** 앱 안 브라우저 이름 (카카오톡·인스타그램 등). 아니면 "none" */
function inAppBrowser(ua: string): string {
  if (/KAKAOTALK/i.test(ua)) return "kakaotalk";
  if (/Instagram/i.test(ua)) return "instagram";
  if (/FBAN|FBAV/i.test(ua)) return "facebook";
  if (/NAVER\(inapp/i.test(ua)) return "naver";
  if (/Line\//i.test(ua)) return "line";
  return "none";
}

function storageState(): { storage: boolean; fallbackCookie: boolean } {
  try {
    const key = "__degul_probe";
    localStorage.setItem(key, "1");
    localStorage.removeItem(key);
    // Appwrite는 쿠키를 못 쓰면 로그인 값을 localStorage "cookieFallback"에 대신 둔다
    const fallback = localStorage.getItem("cookieFallback");
    return { storage: true, fallbackCookie: Boolean(fallback && fallback !== "{}" && fallback !== "[]") };
  } catch {
    return { storage: false, fallbackCookie: false };
  }
}

/** 지금 로그인이 살아 있는지 다시 물어본다. "login"(카카오·구글), "anon"(익명), 또는 "fail-오류번호" */
async function sessionCheck(): Promise<string> {
  try {
    const user = await getAppwrite().account.get();
    return user.labels.length > 0 ? "login" : "anon";
  } catch (e) {
    return `fail-${describeError(e).code}`;
  }
}

async function collectContext(): Promise<ErrorContext> {
  const ua = navigator.userAgent;
  return {
    inApp: inAppBrowser(ua),
    online: navigator.onLine,
    cookies: navigator.cookieEnabled,
    ...storageState(),
    session: await sessionCheck(),
    secondsOnPage: Math.round(performance.now() / 1000),
    path: location.pathname.slice(0, 40),
  };
}

/**
 * 오류를 서버에 남긴다. 실패해도 조용히 넘어간다 (기록 때문에 화면이 멈추면 안 된다).
 * extra: 개인정보가 없는 단서 (예: 실패한 단계, 눈덩이 수, 조각 크기, 글자 수)
 */
export function reportClientError(where: string, info: ErrorInfo, extra: ErrorContext = {}): void {
  void (async () => {
    try {
      const context = { ...(await collectContext()), ...extra };
      await fetch("/api/client-error", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ where, code: info.code, type: info.type, message: info.message, context }),
        keepalive: true,
      });
    } catch {
      // 기록 실패는 무시한다
    }
  })();
}

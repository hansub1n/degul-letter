// 브라우저에서 난 오류를 짧게 정리하고, 우리 서버 로그(/api/client-error)에 남긴다.
// 친구 휴대폰에서만 나는 오류도 Vercel 로그에서 볼 수 있게 하려는 것. 닉네임·편지 내용은 보내지 않는다.

import { AppwriteException } from "appwrite";

export type ErrorInfo = {
  /** 화면에 보일 짧은 번호. Appwrite는 HTTP 코드, 연결이 끊기면 "net" */
  code: string;
  /** Appwrite 오류 종류 (예: user_unauthorized) */
  type: string;
  message: string;
  /** 서버까지 못 간 오류 (인터넷 연결, 막힌 요청) */
  network: boolean;
};

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

/**
 * 오류를 서버 로그에 남긴다. 실패해도 조용히 넘어간다 (로그 때문에 화면이 멈추면 안 된다).
 * detail: 개인정보가 없는 짧은 단서 (예: 눈덩이 수, 조각 데이터 길이)
 */
export function reportClientError(where: string, info: ErrorInfo, detail = ""): void {
  try {
    void fetch("/api/client-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ where, code: info.code, type: info.type, message: info.message, detail }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // fetch 자체가 없는 환경
  }
}

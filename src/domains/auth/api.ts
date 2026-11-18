// 브라우저에서 쓰는 로그인 함수.
// 실제 카카오 확인은 서버(/api/auth/kakao/*)가 하고, 여기서는 시작하고 마무리만 한다.

import { getAppwrite } from "@/shared/lib/appwrite";
import { ensureUserId, forgetUserId } from "@/shared/lib/session";

/** 지금 계정이 카카오 로그인으로 지켜지고 있는지 */
export async function isLoggedIn(): Promise<boolean> {
  await ensureUserId();
  const prefs = await getAppwrite().account.getPrefs<{ kakao?: boolean }>();
  return prefs.kakao === true;
}

/**
 * 카카오 로그인 페이지로 보낸다. 지금 익명 계정이 있으면 서버가 카카오 계정에 잇는다.
 * returnTo: 로그인 뒤 돌아올 우리 사이트 경로
 */
export async function startKakaoLogin(returnTo: string): Promise<void> {
  const { account } = getAppwrite();
  let jwt: string | null = null;
  try {
    jwt = (await account.createJWT()).jwt;
  } catch {
    // 세션이 없으면 새 계정으로 로그인한다
  }
  const res = await fetch("/api/auth/kakao/start", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}) },
    body: JSON.stringify({ returnTo }),
  });
  const data = (await res.json().catch(() => ({}))) as { url?: string; message?: string };
  if (!res.ok || !data.url) throw new Error(data.message ?? "로그인을 시작하지 못했어요");
  window.location.href = data.url;
}

/** 서버가 준 일회용 열쇠로 Appwrite 세션을 만든다. 쓰던 익명 세션은 먼저 지운다. */
export async function completeLogin(userId: string, secret: string): Promise<void> {
  const { account } = getAppwrite();
  try {
    await account.deleteSession({ sessionId: "current" });
  } catch {
    // 세션이 없었으면 그냥 넘어간다
  }
  await account.createSession({ userId, secret });
  forgetUserId();
}

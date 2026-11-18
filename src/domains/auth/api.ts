// 브라우저에서 쓰는 로그인 함수.
// 실제 카카오 확인은 서버(/api/auth/kakao/*)가 하고, 여기서는 시작하고 마무리만 한다.

import { getAppwrite } from "@/shared/lib/appwrite";
import { ensureUserId, forgetUserId } from "@/shared/lib/session";

/**
 * 지금 계정이 로그인(카카오·구글)으로 지켜지고 있는지. 화면 표시용이고, 진짜 확인은 서버가 한다.
 * 카카오는 서버가 붙인 `kakao` 라벨, 구글 등은 Appwrite에 남는 연결 기록으로 안다.
 */
export async function isLoggedIn(): Promise<boolean> {
  await ensureUserId();
  const { account } = getAppwrite();
  const user = await account.get();
  if (user.labels.includes("kakao")) return true;
  const { total } = await account.listIdentities();
  return total > 0;
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

/**
 * 로그아웃: 이 브라우저의 로그인을 지우고, 카카오 계정 로그인도 끊은 뒤 첫 화면으로 돌아간다.
 * 다음에 들어오면 새 익명 계정으로 시작한다 (내 마을은 다시 카카오 로그인하면 찾을 수 있다).
 */
export async function logout(): Promise<void> {
  try {
    await getAppwrite().account.deleteSession({ sessionId: "current" });
  } catch {
    // 이미 세션이 없으면 그냥 넘어간다
  }
  forgetUserId();
  const res = await fetch("/api/auth/kakao/logout", { method: "POST" }).catch(() => null);
  const data = (await res?.json().catch(() => null)) as { url?: string } | null;
  window.location.href = data?.url ?? window.location.origin;
}

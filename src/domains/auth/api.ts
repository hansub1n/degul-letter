// 브라우저에서 쓰는 로그인 함수.
// 실제 확인은 서버(/api/auth/kakao/*, /api/auth/google)가 하고, 여기서는 시작하고 마무리만 한다.

import { getAppwrite } from "@/shared/lib/appwrite";
import { isLoggedInAccount, KAKAO_LABEL } from "@/shared/lib/loginLabels";
import { ensureUserId, forgetUserId, SessionRateLimitError } from "@/shared/lib/session";

/**
 * 지금 계정이 로그인(카카오·구글)으로 지켜지고 있는지. 화면 표시용이고, 진짜 확인은 서버가 한다.
 * 카카오·구글은 서버가 붙인 라벨, 그 밖은 Appwrite에 남는 연결 기록으로 안다. prefs는 보지 않는다.
 */
export async function isLoggedIn(): Promise<boolean> {
  await ensureUserId();
  const { account } = getAppwrite();
  const user = await account.get();
  if (isLoggedInAccount({ labels: user.labels, identityCount: 0 })) return true;
  const { total } = await account.listIdentities();
  return isLoggedInAccount({ labels: user.labels, identityCount: total });
}

/** 로그인을 시작하는 순간에 세션을 만든다 (읽기만 할 때는 만들지 않는다). 한도(429)면 안내 문구로 멈추고, 다른 실패는 새 계정으로 로그인한다. */
async function prepareSession(): Promise<void> {
  try {
    await ensureUserId();
  } catch (e) {
    if (e instanceof SessionRateLimitError) throw e;
  }
}

/**
 * 카카오 로그인 페이지로 보낸다. 지금 익명 계정이 있으면 서버가 카카오 계정에 잇는다.
 * returnTo: 로그인 뒤 돌아올 우리 사이트 경로
 */
export async function startKakaoLogin(returnTo: string): Promise<void> {
  await prepareSession();
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

/**
 * 구글 로그인 페이지로 보낸다. 지금 익명 계정이 있으면 서버가 구글 계정에 잇는다.
 * 앱 안 브라우저에서는 호출하지 않는다. 그 안내는 초대장 카드가 맡는다.
 */
export async function startGoogleLogin(returnTo: string): Promise<void> {
  await prepareSession();
  const { account } = getAppwrite();
  let jwt: string | null = null;
  try {
    jwt = (await account.createJWT()).jwt;
  } catch {
    // 세션이 없으면 새 계정으로 로그인한다
  }
  const res = await fetch("/api/auth/google", {
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
 * 로그아웃: 이 브라우저의 로그인을 지우고 첫 화면으로 돌아간다.
 * 카카오 계정이면 카카오 로그아웃 페이지도 거친다. 구글은 앱 세션만 끊는다
 * (구글 전체 로그아웃은 다른 구글 서비스까지 나가게 해서 쓰지 않는다).
 * 다음에 들어오면 새 익명 계정으로 시작한다.
 */
export async function logout(): Promise<void> {
  let kakao = false;
  try {
    const { account } = getAppwrite();
    const user = await account.get();
    kakao = user.labels.includes(KAKAO_LABEL);
    await account.deleteSession({ sessionId: "current" });
  } catch {
    // 이미 세션이 없으면 그냥 넘어간다
  }
  forgetUserId();
  if (!kakao) {
    window.location.href = window.location.origin;
    return;
  }
  const res = await fetch("/api/auth/kakao/logout", { method: "POST" }).catch(() => null);
  const data = (await res?.json().catch(() => null)) as { url?: string } | null;
  window.location.href = data?.url ?? window.location.origin;
}

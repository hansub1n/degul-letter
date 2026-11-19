// 서버 전용: 카카오·구글 로그인.
// Appwrite에는 둘 다 기본 로그인 수단이 아니라서, 우리 서버가 각 서비스에 직접 물어본 뒤
// Appwrite에 "이 사람으로 로그인시켜 줘" 하고 일회용 열쇠(token)를 받아 브라우저에 넘긴다.
// 서버 키가 필요하므로 브라우저 코드에서 import하면 안 된다 (index.ts로 내보내지 않는다).
// 구글은 openid만 요청하고, 안정적인 sub만 identities에 `google_sub`로 남긴다. 이메일·이름은 쓰지 않는다.

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { Account, AppwriteException, Client, ID, TablesDB, Users } from "node-appwrite";
import { GOOGLE_LABEL, KAKAO_LABEL } from "@/shared/lib/serverAccount";
import { buildGoogleAuthorizeUrl, googleRedirectUri } from "./lib/googleOAuth";
import { identityRowId } from "./lib/identityRow";

export class AuthError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/** 외부 ID → 우리 계정 ID 연결표. 서버 키로만 읽고 쓴다 (테이블 권한 없음). */
const IDENTITIES = "identities";
/** 로그인 도중 상태를 잠깐 보관하는 쿠키 (10분). 경로는 각 로그인 라우트만 */
export const STATE_COOKIE = "degul_kakao";
export const GOOGLE_STATE_COOKIE = "degul_google";
export const STATE_MAX_AGE = 600;

type CoreConfig = {
  endpoint: string;
  projectId: string;
  databaseId: string;
  apiKey: string;
  authSecret: string;
};

function coreConfig(): CoreConfig {
  const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
  const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
  const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
  const apiKey = process.env.APPWRITE_API_KEY;
  const authSecret = process.env.AUTH_SECRET;
  if (!endpoint || !projectId || !databaseId || !apiKey || !authSecret) {
    throw new AuthError(500, "로그인 설정이 비어 있어요");
  }
  return { endpoint, projectId, databaseId, apiKey, authSecret };
}

function kakaoConfig() {
  const kakaoKey = process.env.KAKAO_REST_API_KEY;
  const kakaoSecret = process.env.KAKAO_CLIENT_SECRET;
  if (!kakaoKey || !kakaoSecret) throw new AuthError(500, "로그인 설정이 비어 있어요");
  return { ...coreConfig(), kakaoKey, kakaoSecret };
}

function googleConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new AuthError(500, "로그인 설정이 비어 있어요");
  return { ...coreConfig(), clientId, clientSecret };
}

function admin() {
  const { endpoint, projectId, apiKey } = coreConfig();
  return new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
}

/** 브라우저가 보낸 JWT로 지금 계정 ID를 확인한다. 없거나 틀리면 null (새 기기에서 처음 로그인하는 경우) */
async function userIdFromJwt(jwt: string | null): Promise<string | null> {
  if (!jwt) return null;
  const { endpoint, projectId } = coreConfig();
  try {
    const asUser = new Client().setEndpoint(endpoint).setProject(projectId).setJWT(jwt);
    return (await new Account(asUser).get()).$id;
  } catch {
    return null;
  }
}

// ── 상태 쿠키: 로그인 시작할 때 만든 값이 돌아올 때 그대로인지 서명으로 확인한다 ──

type LoginState = { nonce: string; userId: string | null; returnTo: string; exp: number };

function sign(payload: string): string {
  return createHmac("sha256", coreConfig().authSecret).update(payload).digest("base64url");
}

function encodeState(state: LoginState): string {
  const payload = Buffer.from(JSON.stringify(state)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function decodeState(cookie: string | undefined): LoginState | null {
  if (!cookie) return null;
  const [payload, mac] = cookie.split(".");
  if (!payload || !mac) return null;
  const expected = Buffer.from(sign(payload));
  const actual = Buffer.from(mac);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  try {
    const state = JSON.parse(Buffer.from(payload, "base64url").toString()) as LoginState;
    return state.exp > Date.now() ? state : null;
  } catch {
    return null;
  }
}

/** 돌아갈 주소는 우리 사이트 안의 경로만 받는다 (다른 사이트로 튕겨 보내기 방지) */
function safePath(path: unknown): string {
  return typeof path === "string" && path.startsWith("/") && !path.startsWith("//") ? path : "/";
}

function redirectUri(origin: string): string {
  return `${origin}/api/auth/kakao/callback`;
}

async function beginLogin(params: {
  jwt: string | null;
  returnTo: unknown;
}): Promise<{ nonce: string; cookie: string }> {
  const nonce = randomBytes(16).toString("base64url");
  const state: LoginState = {
    nonce,
    userId: await userIdFromJwt(params.jwt),
    returnTo: safePath(params.returnTo),
    exp: Date.now() + STATE_MAX_AGE * 1000,
  };
  return { nonce, cookie: encodeState(state) };
}

/**
 * 외부 ID에 맞는 우리 계정을 찾는다.
 * - 전에 이은 적 있으면 그 계정 (다른 기기에서 로그인해도 같은 마을)
 * - 처음이면 지금 쓰던 익명 계정을 그대로 잇는다 (이미 만든 마을이 따라온다)
 * - 익명 계정도 없으면 새 계정을 만든다
 */
async function resolveUser(
  provider: "kakao" | "google",
  externalId: string,
  currentUserId: string | null,
  label: string,
): Promise<string> {
  const rowId = identityRowId(provider, externalId);
  if (!rowId) throw new AuthError(401, "로그인 정보를 확인하지 못했어요");
  const { databaseId } = coreConfig();
  const client = admin();
  const tables = new TablesDB(client);
  const users = new Users(client);
  let userId: string;
  try {
    const row = (await tables.getRow({ databaseId, tableId: IDENTITIES, rowId })) as unknown as { userId: string };
    userId = row.userId;
  } catch (e) {
    if (!(e instanceof AppwriteException && e.code === 404)) throw e;
    userId = currentUserId ?? (await users.create({ userId: ID.unique() })).$id;
    await tables.createRow({ databaseId, tableId: IDENTITIES, rowId, data: { userId } });
  }
  await ensureLabel(users, userId, label);
  return userId;
}

/**
 * 로그인한 계정이라는 표시. 라벨은 서버 키로만 붙일 수 있어서(브라우저에서 못 바꿈)
 * 마을 만들기 같은 서버 확인에 쓴다. 표시가 없던 예전 계정도 다음 로그인 때 붙는다.
 */
async function ensureLabel(users: Users, userId: string, label: string): Promise<void> {
  const user = await users.get({ userId });
  if (user.labels.includes(label)) return;
  await users.updateLabels({ userId, labels: [...user.labels, label] });
}

function readSavedState(params: { state: string | null; cookie: string | undefined; code: string | null }): LoginState {
  const saved = decodeState(params.cookie);
  if (!saved || !params.state || saved.nonce !== params.state || !params.code) {
    throw new AuthError(400, "로그인이 만료됐어요. 다시 시도해 주세요");
  }
  return saved;
}

async function issueToken(userId: string, returnTo: string): Promise<{ userId: string; secret: string; returnTo: string }> {
  const token = await new Users(admin()).createToken({ userId, expire: 60 });
  return { userId, secret: token.secret, returnTo };
}

/**
 * 1) 카카오 로그인 시작: 카카오 로그인 페이지 주소와, 브라우저에 심을 상태 쿠키를 만든다.
 * 지금 익명 계정(JWT)이 있으면 기억해 두었다가 카카오 계정에 잇는다.
 */
export async function startKakaoLogin(params: {
  jwt: string | null;
  returnTo: unknown;
  origin: string;
}): Promise<{ url: string; cookie: string }> {
  const { kakaoKey } = kakaoConfig();
  const { nonce, cookie } = await beginLogin(params);
  const url = new URL("https://kauth.kakao.com/oauth/authorize");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", kakaoKey);
  url.searchParams.set("redirect_uri", redirectUri(params.origin));
  url.searchParams.set("state", nonce);
  return { url: url.toString(), cookie };
}

/** 카카오가 돌려준 code로 카카오 회원번호를 알아낸다 */
async function kakaoUserId(code: string, origin: string): Promise<string> {
  const { kakaoKey, kakaoSecret } = kakaoConfig();
  const tokenRes = await fetch("https://kauth.kakao.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: kakaoKey,
      client_secret: kakaoSecret,
      redirect_uri: redirectUri(origin),
      code,
    }),
  });
  if (!tokenRes.ok) throw new AuthError(401, "카카오 로그인에 실패했어요");
  const { access_token } = (await tokenRes.json()) as { access_token?: string };
  if (!access_token) throw new AuthError(401, "카카오 로그인에 실패했어요");

  const meRes = await fetch("https://kapi.kakao.com/v2/user/me", {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  if (!meRes.ok) throw new AuthError(401, "카카오 정보를 받지 못했어요");
  const { id } = (await meRes.json()) as { id?: number };
  if (!id) throw new AuthError(401, "카카오 정보를 받지 못했어요");
  return String(id);
}

/**
 * 2) 카카오에서 돌아왔을 때: 상태를 확인하고, 계정을 찾고, 일회용 열쇠를 만든다.
 * 열쇠는 브라우저가 1분 안에 Appwrite 세션으로 바꾼다.
 */
export async function finishKakaoLogin(params: {
  code: string | null;
  state: string | null;
  cookie: string | undefined;
  origin: string;
}): Promise<{ userId: string; secret: string; returnTo: string }> {
  const saved = readSavedState(params);
  const kakaoId = await kakaoUserId(params.code!, params.origin);
  const userId = await resolveUser("kakao", kakaoId, saved.userId, KAKAO_LABEL);
  return issueToken(userId, saved.returnTo);
}

/**
 * 1) 구글 로그인 시작. 카카오와 같이 상태 쿠키를 서명해 심고, 인가 코드 주소만 돌려준다.
 */
export async function startGoogleLogin(params: {
  jwt: string | null;
  returnTo: unknown;
  origin: string;
}): Promise<{ url: string; cookie: string }> {
  const { clientId } = googleConfig();
  const { nonce, cookie } = await beginLogin(params);
  const url = buildGoogleAuthorizeUrl({
    clientId,
    redirectUri: googleRedirectUri(params.origin),
    nonce,
  });
  return { url, cookie };
}

/** 구글이 돌려준 code로 sub(변하지 않는 계정 번호)만 알아낸다 */
async function googleSub(code: string, origin: string): Promise<string> {
  const { clientId, clientSecret } = googleConfig();
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: googleRedirectUri(origin),
      code,
    }),
  });
  if (!tokenRes.ok) throw new AuthError(401, "구글 로그인에 실패했어요");
  const { access_token } = (await tokenRes.json()) as { access_token?: string };
  if (!access_token) throw new AuthError(401, "구글 로그인에 실패했어요");

  const meRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  if (!meRes.ok) throw new AuthError(401, "구글 정보를 받지 못했어요");
  const { sub } = (await meRes.json()) as { sub?: unknown };
  if (typeof sub !== "string" || !sub) throw new AuthError(401, "구글 정보를 받지 못했어요");
  return sub;
}

/**
 * 2) 구글에서 돌아왔을 때: 상태·서명을 확인하고, google_sub 계정을 찾고, 일회용 열쇠를 만든다.
 */
export async function finishGoogleLogin(params: {
  code: string | null;
  state: string | null;
  cookie: string | undefined;
  origin: string;
}): Promise<{ userId: string; secret: string; returnTo: string }> {
  const saved = readSavedState(params);
  const sub = await googleSub(params.code!, params.origin);
  const userId = await resolveUser("google", sub, saved.userId, GOOGLE_LABEL);
  return issueToken(userId, saved.returnTo);
}

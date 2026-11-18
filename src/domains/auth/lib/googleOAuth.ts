// 구글 로그인 주소만 만든다. 비밀 키는 넣지 않는다. 콜백에서 코드로 바꾼다.

const AUTHORIZE = "https://accounts.google.com/o/oauth2/v2/auth";

export function googleRedirectUri(origin: string): string {
  return `${origin}/api/auth/google/callback`;
}

/** scope는 openid만. 회원 식별은 id_token/userinfo의 sub만 쓰고 이메일·이름은 요청하지 않는다. */
export function buildGoogleAuthorizeUrl(params: { clientId: string; redirectUri: string; nonce: string }): string {
  const url = new URL(AUTHORIZE);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", params.clientId);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("scope", "openid");
  url.searchParams.set("state", params.nonce);
  // 공용 컴퓨터에서 이전 구글 계정으로 바로 들어가지 않게 계정을 고르게 한다.
  url.searchParams.set("prompt", "select_account");
  return url.toString();
}

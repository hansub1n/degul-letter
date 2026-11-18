import { AuthError, STATE_COOKIE, STATE_MAX_AGE, startKakaoLogin } from "@/domains/auth/server";

// 카카오 로그인 시작: 브라우저는 { returnTo }와 (있으면) Authorization: Bearer <JWT>를 보낸다.
// 카카오 로그인 페이지 주소를 돌려주고, 돌아왔을 때 확인할 상태를 쿠키에 심는다.
export async function POST(request: Request) {
  const jwt = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null;
  const body = (await request.json().catch(() => null)) as { returnTo?: unknown } | null;
  const origin = new URL(request.url).origin;

  try {
    const { url, cookie } = await startKakaoLogin({ jwt, returnTo: body?.returnTo, origin });
    const secure = origin.startsWith("https:") ? "; Secure" : "";
    return Response.json(
      { url },
      {
        headers: {
          "Set-Cookie": `${STATE_COOKIE}=${cookie}; Path=/api/auth/kakao; Max-Age=${STATE_MAX_AGE}; HttpOnly; SameSite=Lax${secure}`,
        },
      },
    );
  } catch (e) {
    if (e instanceof AuthError) return Response.json({ message: e.message }, { status: e.status });
    console.error(e);
    return Response.json({ message: "로그인을 시작하지 못했어요" }, { status: 500 });
  }
}

import { AuthError, GOOGLE_STATE_COOKIE, STATE_MAX_AGE, startGoogleLogin } from "@/domains/auth/server";
import { detectInApp } from "@/domains/auth/lib/inAppBrowser";

// 구글 로그인 시작: 브라우저는 { returnTo }와 (있으면) Authorization: Bearer <JWT>를 보낸다.
// 구글 로그인 페이지 주소를 돌려주고, 돌아왔을 때 확인할 상태를 쿠키에 심는다.
// 앱 안 브라우저에서는 구글이 OAuth를 막으므로 주소를 만들지 않는다. 화면이 바깥 브라우저로 안내한다.
export async function POST(request: Request) {
  const ua = request.headers.get("user-agent") ?? "";
  if (detectInApp(ua)) {
    return Response.json(
      { message: "이 앱 안에서는 구글 로그인을 열 수 없어요. Safari나 Chrome에서 열어 주세요." },
      { status: 400 },
    );
  }

  const jwt = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null;
  const body = (await request.json().catch(() => null)) as { returnTo?: unknown } | null;
  const origin = new URL(request.url).origin;

  try {
    const { url, cookie } = await startGoogleLogin({ jwt, returnTo: body?.returnTo, origin });
    const secure = origin.startsWith("https:") ? "; Secure" : "";
    return Response.json(
      { url },
      {
        headers: {
          "Set-Cookie": `${GOOGLE_STATE_COOKIE}=${cookie}; Path=/api/auth/google; Max-Age=${STATE_MAX_AGE}; HttpOnly; SameSite=Lax${secure}`,
        },
      },
    );
  } catch (e) {
    if (e instanceof AuthError) return Response.json({ message: e.message }, { status: e.status });
    console.error(e);
    return Response.json({ message: "로그인을 시작하지 못했어요" }, { status: 500 });
  }
}

import { cookies } from "next/headers";
import { AuthError, GOOGLE_STATE_COOKIE, finishGoogleLogin } from "@/domains/auth/server";

// 구글이 로그인 뒤 돌려보내는 주소. 일회용 열쇠를 만들어 /auth/done 으로 넘긴다.
// 열쇠는 주소의 # 뒤에 붙여서 서버 기록(로그)에 남지 않게 한다.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const jar = await cookies();
  const cookie = jar.get(GOOGLE_STATE_COOKIE)?.value;
  jar.delete({ name: GOOGLE_STATE_COOKIE, path: "/api/auth/google" });

  const done = new URL("/auth/done", url.origin);
  // 사용자가 구글 화면에서 취소한 경우
  if (url.searchParams.get("error")) {
    done.hash = new URLSearchParams({ error: "로그인을 취소했어요" }).toString();
    return Response.redirect(done, 303);
  }

  try {
    const { userId, secret, returnTo } = await finishGoogleLogin({
      code: url.searchParams.get("code"),
      state: url.searchParams.get("state"),
      cookie,
      origin: url.origin,
    });
    done.hash = new URLSearchParams({ userId, secret, returnTo }).toString();
  } catch (e) {
    if (!(e instanceof AuthError)) console.error(e);
    done.hash = new URLSearchParams({
      error: e instanceof AuthError ? e.message : "로그인하지 못했어요",
    }).toString();
  }
  return Response.redirect(done, 303);
}

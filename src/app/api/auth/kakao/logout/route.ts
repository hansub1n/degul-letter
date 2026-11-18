// 카카오 계정까지 로그아웃할 주소를 알려 준다. 브라우저는 카카오 로그아웃 페이지를 거쳐 첫 화면으로 돌아온다.
// PC방 같은 공용 컴퓨터에서 다음 사람이 카카오 자동 로그인으로 내 마을에 들어오지 못하게 한다.
// 카카오 개발자 콘솔의 "로그아웃 리다이렉트 URI"에 `{사이트}/`가 등록돼 있어야 한다.
export function POST(request: Request) {
  const origin = new URL(request.url).origin;
  const key = process.env.KAKAO_REST_API_KEY;
  if (!key) return Response.json({ url: `${origin}/` });
  const url = new URL("https://kauth.kakao.com/oauth/logout");
  url.searchParams.set("client_id", key);
  url.searchParams.set("logout_redirect_uri", `${origin}/`);
  return Response.json({ url: url.toString() });
}

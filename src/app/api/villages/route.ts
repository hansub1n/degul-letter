import { createVillageForUser, VillageCreateError } from "@/domains/village/server";

// 마을 만들기: 브라우저는 { name }과 Authorization: Bearer <JWT>를 보낸다.
// 카카오 로그인했는지, 이미 마을이 있는지는 village 도메인의 서버 코드가 확인한다.
export async function POST(request: Request) {
  const jwt = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const body = (await request.json().catch(() => null)) as { name?: unknown } | null;
  if (!jwt) return Response.json({ message: "다시 들어와 주세요" }, { status: 401 });

  try {
    return Response.json(await createVillageForUser({ jwt, name: body?.name }));
  } catch (e) {
    if (e instanceof VillageCreateError) return Response.json({ message: e.message }, { status: e.status });
    console.error(e);
    return Response.json({ message: "마을을 만들지 못했어요" }, { status: 500 });
  }
}

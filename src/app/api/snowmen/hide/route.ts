import { setSnowmanHiddenForOwner, VillageCreateError } from "@/domains/village/server";

// 눈사람 숨기기·다시 보이기: 브라우저는 { snowmanId, hidden }과 Authorization: Bearer <JWT>를 보낸다.
// 마을 주인인지는 village 도메인의 서버 코드가 확인하고, 서버 키로 hidden 칸 하나만 바꾼다.
export async function POST(request: Request) {
  const jwt = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const body = (await request.json().catch(() => null)) as { snowmanId?: unknown; hidden?: unknown } | null;

  try {
    return Response.json(await setSnowmanHiddenForOwner({ jwt, snowmanId: body?.snowmanId, hidden: body?.hidden }));
  } catch (e) {
    if (e instanceof VillageCreateError) return Response.json({ message: e.message }, { status: e.status });
    console.error(e);
    return Response.json({ message: "처리하지 못했어요" }, { status: 500 });
  }
}

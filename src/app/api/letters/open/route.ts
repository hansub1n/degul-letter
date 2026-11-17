import { parseTodayOverride } from "@/domains/letter/lib/dday";
import { LetterAccessError, openLetterForOwner } from "@/domains/letter/server";

// 편지 열기: 브라우저는 { villageId, letterId }와 함께 Authorization: Bearer <JWT>를 보낸다.
// 실제 확인(주인인지, 크리스마스인지)은 letter 도메인의 서버 코드가 한다.
export async function POST(request: Request) {
  const jwt = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const body = (await request.json().catch(() => null)) as {
    villageId?: string;
    letterId?: string;
    today?: string;
  } | null;
  if (!jwt || !body?.villageId || !body.letterId) {
    return Response.json({ message: "잘못된 요청이에요" }, { status: 400 });
  }

  // 개발 모드에서만 ?today=12-25 미리보기를 서버도 따른다. 배포 버전에서는 항상 진짜 시각.
  const preview = process.env.NODE_ENV === "development" ? parseTodayOverride(body.today) : null;

  try {
    const letter = await openLetterForOwner({
      jwt,
      villageId: body.villageId,
      letterId: body.letterId,
      now: preview ?? Date.now(),
    });
    return Response.json(letter);
  } catch (e) {
    if (e instanceof LetterAccessError) return Response.json({ message: e.message }, { status: e.status });
    console.error(e);
    return Response.json({ message: "편지를 열지 못했어요" }, { status: 500 });
  }
}

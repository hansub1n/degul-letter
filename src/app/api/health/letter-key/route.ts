import { openSeal, sealLetter } from "@/domains/letter/lib/seal";

// 편지 비밀 열쇠(LETTER_PRIVATE_KEY)가 코드의 공개 열쇠와 짝이 맞는지 확인한다.
// 12/25 전에는 배포 사이트에서 편지를 열어 볼 수 없어서, 의미 없는 시험 문장을 잠갔다 풀어 보는 것으로 대신 확인한다.
// 실제 편지는 건드리지 않고, 열쇠 값이나 문장은 돌려주지 않는다. 결과(ok)만 알려 준다.
export async function GET() {
  const key = process.env.LETTER_PRIVATE_KEY;
  if (!key) return Response.json({ ok: false, reason: "missing" }, { headers: { "Cache-Control": "no-store" } });
  try {
    const probe = `degul-${crypto.randomUUID()}`;
    const ok = (await openSeal(await sealLetter(probe), key)) === probe;
    return Response.json({ ok }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ ok: false, reason: "mismatch" }, { headers: { "Cache-Control": "no-store" } });
  }
}

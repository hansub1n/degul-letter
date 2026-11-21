// 브라우저 오류를 Vercel 로그에 남긴다 (src/shared/lib/clientError.ts).
// 어디서(where), 무슨 오류(code·type·message)인지와 브라우저 종류만 받는다. 닉네임·편지 내용은 받지 않는다.

const MAX_BODY = 2000;

function cut(value: unknown, max: number): string {
  return typeof value === "string" ? value.slice(0, max) : "";
}

export async function POST(request: Request) {
  const text = await request.text().catch(() => "");
  if (text.length > MAX_BODY) return new Response(null, { status: 413 });
  let body: Record<string, unknown> = {};
  try {
    const parsed: unknown = JSON.parse(text);
    if (parsed && typeof parsed === "object") body = parsed as Record<string, unknown>;
  } catch {
    return new Response(null, { status: 400 });
  }
  console.error(
    "[client-error]",
    JSON.stringify({
      where: cut(body.where, 40),
      code: cut(body.code, 10),
      type: cut(body.type, 60),
      message: cut(body.message, 300),
      detail: cut(body.detail, 120),
      ua: cut(request.headers.get("user-agent"), 200),
    }),
  );
  return new Response(null, { status: 204 });
}

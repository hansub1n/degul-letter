// 브라우저 오류를 남긴다 (src/shared/lib/clientError.ts가 보낸다).
// Vercel 로그는 금방 지워져서, Appwrite `client_errors` 테이블(서버만 읽고 씀)에도 저장한다.
// 받는 것: 어디서(where), 무슨 오류(code·type·message), 그때 상태(context), 브라우저 종류.
// 닉네임·편지 내용은 받지 않는다. context는 짧은 값만 정해진 개수까지 받는다.

import { Client, ID, TablesDB } from "node-appwrite";

const MAX_BODY = 4000;
const MAX_CONTEXT_KEYS = 24;
const CONTEXT_KEY = /^[A-Za-z][A-Za-z0-9]{0,23}$/;

function cut(value: unknown, max: number): string {
  return typeof value === "string" ? value.slice(0, max) : "";
}

/** 짧은 이름 → 글자(80자)·숫자·참거짓만 남긴다 */
function cleanContext(value: unknown): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  if (!value || typeof value !== "object" || Array.isArray(value)) return out;
  for (const [key, v] of Object.entries(value).slice(0, MAX_CONTEXT_KEYS)) {
    if (!CONTEXT_KEY.test(key)) continue;
    if (typeof v === "string") out[key] = v.slice(0, 80);
    else if (typeof v === "number" && Number.isFinite(v)) out[key] = v;
    else if (typeof v === "boolean") out[key] = v;
  }
  return out;
}

async function store(row: Record<string, string>): Promise<void> {
  const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
  const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
  const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
  const apiKey = process.env.APPWRITE_API_KEY;
  if (!endpoint || !projectId || !databaseId || !apiKey) return;
  const tables = new TablesDB(new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey));
  await tables.createRow({ databaseId, tableId: "client_errors", rowId: ID.unique(), data: row });
}

export async function POST(request: Request) {
  const text = await request.text().catch(() => "");
  if (text.length > MAX_BODY) return new Response(null, { status: 413 });
  let body: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(text);
    if (!parsed || typeof parsed !== "object") return new Response(null, { status: 400 });
    body = parsed as Record<string, unknown>;
  } catch {
    return new Response(null, { status: 400 });
  }
  const row = {
    where: cut(body.where, 40) || "unknown",
    code: cut(body.code, 10) || "?",
    type: cut(body.type, 60),
    message: cut(body.message, 300),
    context: JSON.stringify(cleanContext(body.context)).slice(0, 1500),
    ua: cut(request.headers.get("user-agent"), 300),
  };
  console.error("[client-error]", JSON.stringify(row));
  try {
    await store(row);
  } catch (e) {
    console.error("[client-error] 저장 실패", e instanceof Error ? e.message : e);
  }
  return new Response(null, { status: 204 });
}

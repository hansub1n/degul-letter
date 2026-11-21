// 봉인(암호화) 전에 그대로 저장된 편지를 한 번에 봉인한다. src/domains/letter/lib/seal.ts와 같은 방식.
// 실행: pnpm seal:letters            (몇 통을 바꿀지 세기만 한다)
//       pnpm seal:letters --apply    (실제로 바꾼다. 한 통씩 봉인 → 풀어 보고 같을 때만 저장)
// 여러 번 실행해도 괜찮다: 이미 봉인된 편지는 건너뛴다.

import { Client, Query, TablesDB } from "node-appwrite";
import { isSealed, openSeal, sealLetter } from "../src/domains/letter/lib/seal.ts";

const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
const apiKey = process.env.APPWRITE_API_KEY;
const letterKey = process.env.LETTER_PRIVATE_KEY;

for (const [name, value] of Object.entries({ endpoint, projectId, databaseId, apiKey, letterKey })) {
  if (!value) {
    console.error(`❌ ${name} 값이 비어 있어요. .env.local을 확인해 주세요.`);
    process.exit(1);
  }
}

const apply = process.argv.includes("--apply");
const tables = new TablesDB(new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey));

let cursor = null;
let total = 0;
let plain = 0;
let sealed = 0;
for (;;) {
  const queries = [Query.limit(100), Query.orderAsc("$id"), Query.select(["$id", "content"])];
  if (cursor) queries.push(Query.cursorAfter(cursor));
  const { rows } = await tables.listRows({ databaseId, tableId: "letters", queries });
  if (rows.length === 0) break;
  for (const row of rows) {
    total++;
    if (isSealed(row.content)) continue;
    plain++;
    if (!apply) continue;
    const next = await sealLetter(row.content);
    // 저장하기 전에 풀어 보고 원래 글과 같은지 확인한다
    if ((await openSeal(next, letterKey)) !== row.content) throw new Error(`${row.$id}: 봉인 확인 실패`);
    await tables.updateRow({ databaseId, tableId: "letters", rowId: row.$id, data: { content: next } });
    sealed++;
  }
  cursor = rows[rows.length - 1].$id;
}

console.log(`편지 ${total}통 중 봉인 안 된 편지 ${plain}통`);
console.log(apply ? `✅ ${sealed}통 봉인 완료` : "세기만 했어요. 바꾸려면 --apply");

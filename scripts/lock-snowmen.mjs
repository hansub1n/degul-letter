// 이미 저장된 눈사람 행에서 고치기(update) 권한을 걷어 내는 한 번짜리 스크립트.
// 실행: pnpm lock:snowmen            (몇 개를 바꿀지 세기만 한다)
//       pnpm lock:snowmen --apply    (실제로 바꾼다)
//
// 왜: 예전 눈사람은 만든 사람에게 고치기 권한이 있어서, 게임 화면을 거치지 않고 Appwrite에 직접 요청하면
// 이름을 금칙어로 바꾸거나 주인이 숨긴 눈사람(hidden)을 되돌릴 수 있다. 새 눈사람은 처음부터 이 권한이 없다.
// 읽기(누구나)·지우기(만든 사람) 권한은 그대로 둔다. 눈사람 모양·이름·편지는 건드리지 않는다.

import { Client, Query, TablesDB } from "node-appwrite";

const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
const apiKey = process.env.APPWRITE_API_KEY;
for (const [name, value] of Object.entries({ endpoint, projectId, databaseId, apiKey })) {
  if (!value) {
    console.error(`❌ ${name} 값이 비어 있어요. .env.local을 확인해 주세요.`);
    process.exit(1);
  }
}

const apply = process.argv.includes("--apply");
const tables = new TablesDB(new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey));

const PAGE = 100;
let cursor = null;
let total = 0;
let locked = 0;
for (;;) {
  const queries = [Query.limit(PAGE)];
  if (cursor) queries.push(Query.cursorAfter(cursor));
  const { rows } = await tables.listRows({ databaseId, tableId: "snowmen", queries });
  for (const row of rows) {
    total++;
    const permissions = row.$permissions.filter((p) => !p.startsWith("update("));
    if (permissions.length === row.$permissions.length) continue;
    locked++;
    if (apply) await tables.updateRow({ databaseId, tableId: "snowmen", rowId: row.$id, permissions });
  }
  if (rows.length < PAGE) break;
  cursor = rows[rows.length - 1].$id;
}

console.log(`눈사람 ${total}개 중 고치기 권한이 남은 ${locked}개${apply ? "에서 권한을 걷어 냈어요." : "를 찾았어요. 바꾸려면 --apply 를 붙여 주세요."}`);

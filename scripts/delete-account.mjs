// 개인정보 삭제 요청(또는 만 14세 미만 확인) 때 한 사람의 정보를 한 번에 지우는 스크립트.
// 실행: pnpm delete:account --village <마을 코드>     (그 마을 주인)
//       pnpm delete:account --user <계정 ID>
// 기본은 무엇을 지울지 세기만 한다. 실제로 지우려면 --apply 를 붙인다. 지운 것은 되돌릴 수 없다.
//
// 지우는 것
// - 그 사람의 마을, 그 마을에 달린 모든 눈사람과 편지
// - 그 사람이 다른 마을에 남긴 눈사람과 편지
// - 카카오·구글 연결표(identities)와 Appwrite 계정

import { Client, Query, TablesDB, Users } from "node-appwrite";

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

const args = process.argv.slice(2);
const arg = (flag) => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : undefined;
};
const apply = args.includes("--apply");
const villageCode = arg("--village");
let userId = arg("--user");
if (!villageCode && !userId) {
  console.error("사용법: pnpm delete:account --village <마을 코드> | --user <계정 ID> [--apply]");
  process.exit(1);
}

const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
const tables = new TablesDB(client);
const users = new Users(client);

/** 조건에 맞는 줄을 모두 가져온다 (100줄씩) */
async function listAll(tableId, queries) {
  const out = [];
  let cursor = null;
  for (;;) {
    const page = [...queries, Query.limit(100), Query.orderAsc("$id")];
    if (cursor) page.push(Query.cursorAfter(cursor));
    const { rows } = await tables.listRows({ databaseId, tableId, queries: page });
    out.push(...rows);
    if (rows.length < 100) return out;
    cursor = rows[rows.length - 1].$id;
  }
}

if (villageCode) {
  const [village] = await listAll("villages", [Query.equal("code", villageCode)]);
  if (!village) {
    console.error(`❌ 마을 코드 ${villageCode}를 찾지 못했어요`);
    process.exit(1);
  }
  userId = village.ownerId;
}

const villages = await listAll("villages", [Query.equal("ownerId", userId)]);
const villageIds = villages.map((v) => v.$id);
const snowmenInVillages = villageIds.length ? await listAll("snowmen", [Query.equal("villageId", villageIds)]) : [];
const lettersInVillages = villageIds.length ? await listAll("letters", [Query.equal("villageId", villageIds)]) : [];
const snowmenByUser = await listAll("snowmen", [Query.equal("authorId", userId)]);
const lettersByUser = await listAll("letters", [Query.equal("authorId", userId)]);
const identities = await listAll("identities", [Query.equal("userId", userId)]);

const unique = (rows) => [...new Map(rows.map((r) => [r.$id, r])).values()];
const snowmen = unique([...snowmenInVillages, ...snowmenByUser]);
const letters = unique([...lettersInVillages, ...lettersByUser]);
let hasUser = true;
try {
  await users.get({ userId });
} catch {
  hasUser = false;
}

console.log(`계정 ${userId}`);
console.log(`- 마을 ${villages.length}개 ${villages.map((v) => `(${v.code})`).join(" ")}`);
console.log(`- 눈사람 ${snowmen.length}개 (마을에 달린 것 ${snowmenInVillages.length}, 이 사람이 남긴 것 ${snowmenByUser.length})`);
console.log(`- 편지 ${letters.length}통 (마을에 온 것 ${lettersInVillages.length}, 이 사람이 쓴 것 ${lettersByUser.length})`);
console.log(`- 로그인 연결 ${identities.length}개, Appwrite 계정 ${hasUser ? "있음" : "없음"}`);

if (!apply) {
  console.log("\n세기만 했어요. 지우려면 --apply 를 붙여 주세요 (되돌릴 수 없어요).");
  process.exit(0);
}

for (const r of letters) await tables.deleteRow({ databaseId, tableId: "letters", rowId: r.$id });
for (const r of snowmen) await tables.deleteRow({ databaseId, tableId: "snowmen", rowId: r.$id });
for (const r of villages) await tables.deleteRow({ databaseId, tableId: "villages", rowId: r.$id });
for (const r of identities) await tables.deleteRow({ databaseId, tableId: "identities", rowId: r.$id });
if (hasUser) await users.delete({ userId });
console.log("\n✅ 모두 지웠어요");

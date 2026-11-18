// Appwrite 테이블을 한 번에 만드는 설정 스크립트.
// 실행: pnpm setup:appwrite   (.env.local의 값과 비밀 키 APPWRITE_API_KEY를 쓴다)
// 여러 번 실행해도 괜찮다: 이미 있는 테이블·칸·인덱스는 건너뛴다.

import { Client, Permission, Role, TablesDB, TablesDBIndexType } from "node-appwrite";

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

const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
const tables = new TablesDB(client);

/** 이미 있으면(409) 건너뛴다 */
async function ensure(label, create) {
  try {
    await create();
    console.log(`  ✅ ${label}`);
  } catch (e) {
    if (e?.code === 409) console.log(`  ⏭️  ${label} (이미 있음)`);
    else throw e;
  }
}

/** 칸은 만든 뒤 잠깐 "처리 중"이라, 인덱스를 만들기 전에 모두 준비될 때까지 기다린다 */
async function waitColumns(tableId) {
  for (let i = 0; i < 30; i++) {
    const { columns } = await tables.listColumns({ databaseId, tableId });
    if (columns.every((c) => c.status === "available")) return;
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`${tableId} 칸이 준비되지 않았어요`);
}

// 테이블 권한: 누구나 읽기, 로그인한 사람(익명 포함)만 만들기.
// 줄마다 따로 권한을 줄 수 있게(rowSecurity) 해서, 고치기·지우기는 만든 사람만 하게 한다.
const tablePermissions = [Permission.read(Role.any()), Permission.create(Role.users())];

async function setupVillages() {
  const tableId = "villages";
  console.log("🏡 villages");
  await ensure("테이블", () =>
    tables.createTable({ databaseId, tableId, name: "villages", permissions: tablePermissions, rowSecurity: true }),
  );
  await ensure("name", () => tables.createVarcharColumn({ databaseId, tableId, key: "name", size: 30, required: true }));
  await ensure("code", () => tables.createVarcharColumn({ databaseId, tableId, key: "code", size: 12, required: true }));
  await ensure("ownerId", () =>
    tables.createVarcharColumn({ databaseId, tableId, key: "ownerId", size: 36, required: true }),
  );
  await waitColumns(tableId);
  await ensure("code 고유 인덱스", () =>
    tables.createIndex({ databaseId, tableId, key: "code_unique", type: TablesDBIndexType.Unique, columns: ["code"] }),
  );
  await ensure("ownerId 인덱스", () =>
    tables.createIndex({ databaseId, tableId, key: "owner", type: TablesDBIndexType.Key, columns: ["ownerId"] }),
  );
}

async function setupSnowmen() {
  const tableId = "snowmen";
  console.log("⛄ snowmen");
  await ensure("테이블", () =>
    tables.createTable({ databaseId, tableId, name: "snowmen", permissions: tablePermissions, rowSecurity: true }),
  );
  await ensure("villageId", () =>
    tables.createVarcharColumn({ databaseId, tableId, key: "villageId", size: 36, required: true }),
  );
  await ensure("authorId", () =>
    tables.createVarcharColumn({ databaseId, tableId, key: "authorId", size: 36, required: true }),
  );
  await ensure("authorName", () =>
    tables.createVarcharColumn({ databaseId, tableId, key: "authorName", size: 20, required: true }),
  );
  await ensure("x", () => tables.createFloatColumn({ databaseId, tableId, key: "x", required: true }));
  await ensure("y", () => tables.createFloatColumn({ databaseId, tableId, key: "y", required: true }));
  // 눈덩이 반지름 목록 (JSON 문자열, 예: "[14,10,7]")
  await ensure("balls", () => tables.createVarcharColumn({ databaseId, tableId, key: "balls", size: 100, required: true }));
  // 조각 데이터 (JSON 문자열: 크기 + 칸 값을 base64로)
  await ensure("sculpt", () => tables.createTextColumn({ databaseId, tableId, key: "sculpt", required: true }));
  // 이 눈사람에 넣은 편지 ID (편지가 없으면 비어 있음). 편지 내용은 letters에 따로, 아무도 못 읽게 둔다.
  await ensure("letterId", () =>
    tables.createVarcharColumn({ databaseId, tableId, key: "letterId", size: 36, required: false }),
  );
  await waitColumns(tableId);
  await ensure("villageId 인덱스", () =>
    tables.createIndex({ databaseId, tableId, key: "village", type: TablesDBIndexType.Key, columns: ["villageId"] }),
  );
}

async function setupLetters() {
  const tableId = "letters";
  console.log("💌 letters");
  // 편지는 테이블에 "읽기" 권한을 아예 주지 않는다. 마을 주인도 쓴 사람도 브라우저에서는 읽을 수 없다.
  // 12/25 이후 주인에게만 보여 주는 일은 서버 함수(API 키로 읽기)가 맡는다.
  await ensure("테이블", () =>
    tables.createTable({
      databaseId,
      tableId,
      name: "letters",
      permissions: [Permission.create(Role.users())],
      rowSecurity: true,
    }),
  );
  await ensure("villageId", () =>
    tables.createVarcharColumn({ databaseId, tableId, key: "villageId", size: 36, required: true }),
  );
  await ensure("authorId", () =>
    tables.createVarcharColumn({ databaseId, tableId, key: "authorId", size: 36, required: true }),
  );
  await ensure("authorName", () =>
    tables.createVarcharColumn({ databaseId, tableId, key: "authorName", size: 20, required: true }),
  );
  await ensure("content", () => tables.createTextColumn({ databaseId, tableId, key: "content", required: true }));
  await waitColumns(tableId);
  await ensure("villageId 인덱스", () =>
    tables.createIndex({ databaseId, tableId, key: "village", type: TablesDBIndexType.Key, columns: ["villageId"] }),
  );
}

async function setupIdentities() {
  const tableId = "identities";
  console.log("🔑 identities");
  // 카카오 회원번호 → 우리 계정 ID 연결표. 줄 ID가 "kakao_회원번호"라서 인덱스가 필요 없다.
  // 권한을 아무에게도 주지 않는다. 로그인 서버(API 키)만 읽고 쓴다.
  await ensure("테이블", () =>
    tables.createTable({ databaseId, tableId, name: "identities", permissions: [], rowSecurity: false }),
  );
  await ensure("userId", () =>
    tables.createVarcharColumn({ databaseId, tableId, key: "userId", size: 36, required: true }),
  );
  await waitColumns(tableId);
}

try {
  await setupVillages();
  await setupSnowmen();
  await setupLetters();
  await setupIdentities();
  console.log("\n🎉 Appwrite 테이블 준비 완료");
} catch (e) {
  console.error("\n❌ 실패:", e?.message ?? e);
  process.exit(1);
}

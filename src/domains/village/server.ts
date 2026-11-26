// 서버 전용: 마을 만들기.
// 마을은 로그인한 계정(카카오·구글)만, 한 계정에 하나만 만들 수 있다. 화면에서 숨기는 것만으로는
// 개발자 도구로 우회할 수 있어서, 마을 테이블의 "만들기" 권한을 없애고 여기서 서버 키로 대신 만든다.
// 서버 키가 필요하므로 브라우저 코드에서 import하면 안 된다 (index.ts로 내보내지 않는다).

import { AppwriteException, Client, ID, Permission, Query, Role, TablesDB } from "node-appwrite";
import { verifyAccount } from "@/shared/lib/serverAccount";
import { nicknameProblem } from "./lib/nickname";
import { NICKNAME_MAX } from "./types";

export class VillageCreateError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/** 화면 입력칸과 같은 닉네임 길이 제한 (types.ts의 NICKNAME_MAX) */
export const VILLAGE_NAME_MAX = NICKNAME_MAX;

const CODE_CHARS = "abcdefghjkmnpqrstuvwxyz23456789";

function randomCode(length = 6): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => CODE_CHARS[b % CODE_CHARS.length]).join("");
}

function config() {
  const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
  const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
  const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
  const apiKey = process.env.APPWRITE_API_KEY;
  if (!endpoint || !projectId || !databaseId || !apiKey) {
    throw new VillageCreateError(500, "서버 설정이 비어 있어요");
  }
  return { endpoint, projectId, databaseId, apiKey };
}

type VillageRow = { $id: string; name: string; code: string; ownerId: string };

/**
 * 공유 링크의 제목에 쓸 마을 이름만. 눈사람·편지·주인 ID는 돌려주지 않는다.
 * 환경 변수가 없거나 마을이 없으면 null (그때 화면은 공통 제목을 쓴다).
 */
export async function getPublicVillageName(code: string): Promise<string | null> {
  if (!/^[a-z0-9]{4,12}$/.test(code)) return null;
  const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
  const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
  const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
  const apiKey = process.env.APPWRITE_API_KEY;
  if (!endpoint || !projectId || !databaseId || !apiKey) return null;
  try {
    const tables = new TablesDB(new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey));
    const { rows } = await tables.listRows({
      databaseId,
      tableId: "villages",
      queries: [Query.equal("code", code), Query.limit(1)],
    });
    const name = (rows[0] as unknown as VillageRow | undefined)?.name;
    if (typeof name !== "string") return null;
    const clean = name.replace(/[\u0000-\u001f]/g, "").trim();
    return clean ? [...clean].slice(0, 30).join("") : null;
  } catch {
    return null;
  }
}

export async function createVillageForUser(params: {
  jwt: string;
  name: unknown;
}): Promise<{ id: string; name: string; code: string; ownerId: string }> {
  const { endpoint, projectId, databaseId, apiKey } = config();

  const name = typeof params.name === "string" ? params.name.trim() : "";
  if (!name || [...name].length > VILLAGE_NAME_MAX) {
    throw new VillageCreateError(400, `닉네임은 1~${VILLAGE_NAME_MAX}자로 적어 주세요`);
  }
  // 화면과 같은 닉네임 규칙 (개발자 도구로 화면 검사를 건너뛰어도 서버에서 막는다)
  const problem = nicknameProblem(name);
  if (problem) throw new VillageCreateError(400, problem);

  // 1) 누구인지, 진짜 로그인했는지 (kakao·google 라벨 또는 Appwrite 연결 기록). prefs만 바꾼 익명 계정은 403
  const account = await verifyAccount(params.jwt);
  if (!account) throw new VillageCreateError(401, "다시 들어와 주세요");
  if (!account.loggedIn) throw new VillageCreateError(403, "로그인하고 마을을 만들어 주세요");
  const { userId } = account;

  const tables = new TablesDB(new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey));

  // 2) 이미 마을이 있으면 새로 만들지 않고 그 마을을 돌려준다 (두 번 눌러도 마을이 하나)
  const { rows } = await tables.listRows({
    databaseId,
    tableId: "villages",
    queries: [Query.equal("ownerId", userId), Query.limit(1)],
  });
  const existing = rows[0] as unknown as VillageRow | undefined;
  if (existing) return { id: existing.$id, name: existing.name, code: existing.code, ownerId: existing.ownerId };

  // 3) 만든다. 누구나 읽기, 고치기·지우기는 주인만. 코드가 우연히 겹치면(아주 드묾) 몇 번 다시 시도한다
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const row = (await tables.createRow({
        databaseId,
        tableId: "villages",
        rowId: ID.unique(),
        data: { name, code: randomCode(), ownerId: userId },
        permissions: [
          Permission.read(Role.any()),
          Permission.update(Role.user(userId)),
          Permission.delete(Role.user(userId)),
        ],
      })) as unknown as VillageRow;
      return { id: row.$id, name: row.name, code: row.code, ownerId: row.ownerId };
    } catch (e) {
      if (!(e instanceof AppwriteException && e.code === 409) || attempt === 2) throw e;
    }
  }
  throw new VillageCreateError(500, "마을을 만들지 못했어요");
}

/**
 * 마을 주인이 방문자 눈사람을 숨기거나 다시 보이게 한다. 행은 지우지 않고 hidden 칸 하나만 바꾼다.
 * 눈사람 모양·이름·자리·편지는 이 함수로 바꿀 수 없다. 편지는 눈사람과 한 덩어리라, 숨기면 편지도 함께 빠진다
 * (편지 열기 서버가 hidden 눈사람의 편지를 거절한다). 로그인 안 한 사람·다른 마을 주인은 403.
 */
export async function setSnowmanHiddenForOwner(params: {
  jwt: string | undefined;
  snowmanId: unknown;
  hidden: unknown;
}): Promise<{ id: string; hidden: boolean }> {
  const { endpoint, projectId, databaseId, apiKey } = config();

  const account = params.jwt ? await verifyAccount(params.jwt) : null;
  if (!account) throw new VillageCreateError(403, "마을 주인만 숨길 수 있어요");

  if (typeof params.snowmanId !== "string" || !/^[A-Za-z0-9_][A-Za-z0-9._-]{0,35}$/.test(params.snowmanId)) {
    throw new VillageCreateError(400, "잘못된 요청이에요");
  }
  if (typeof params.hidden !== "boolean") throw new VillageCreateError(400, "잘못된 요청이에요");

  const tables = new TablesDB(new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey));
  let snowman: { $id: string; villageId: string };
  try {
    snowman = (await tables.getRow({ databaseId, tableId: "snowmen", rowId: params.snowmanId })) as unknown as typeof snowman;
  } catch (e) {
    if (e instanceof AppwriteException && e.code === 404) throw new VillageCreateError(404, "눈사람을 찾을 수 없어요");
    throw e;
  }

  let village: { ownerId: string };
  try {
    village = (await tables.getRow({ databaseId, tableId: "villages", rowId: snowman.villageId })) as unknown as typeof village;
  } catch (e) {
    if (e instanceof AppwriteException && e.code === 404) throw new VillageCreateError(404, "마을을 찾을 수 없어요");
    throw e;
  }
  if (village.ownerId !== account.userId) throw new VillageCreateError(403, "마을 주인만 숨길 수 있어요");

  await tables.updateRow({ databaseId, tableId: "snowmen", rowId: snowman.$id, data: { hidden: params.hidden } });
  return { id: snowman.$id, hidden: params.hidden };
}

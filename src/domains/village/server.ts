// 서버 전용: 마을 만들기.
// 마을은 로그인한 계정(카카오·구글)만, 한 계정에 하나만 만들 수 있다. 화면에서 숨기는 것만으로는
// 개발자 도구로 우회할 수 있어서, 마을 테이블의 "만들기" 권한을 없애고 여기서 서버 키로 대신 만든다.
// 서버 키가 필요하므로 브라우저 코드에서 import하면 안 된다 (index.ts로 내보내지 않는다).

import { AppwriteException, Client, ID, Permission, Query, Role, TablesDB } from "node-appwrite";
import { verifyAccount } from "@/shared/lib/serverAccount";

export class VillageCreateError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/** 화면 입력칸과 같은 닉네임 길이 제한 */
export const VILLAGE_NAME_MAX = 10;

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

export async function createVillageForUser(params: {
  jwt: string;
  name: unknown;
}): Promise<{ id: string; name: string; code: string; ownerId: string }> {
  const { endpoint, projectId, databaseId, apiKey } = config();

  const name = typeof params.name === "string" ? params.name.trim() : "";
  if (!name || [...name].length > VILLAGE_NAME_MAX) {
    throw new VillageCreateError(400, `닉네임은 1~${VILLAGE_NAME_MAX}자로 적어 주세요`);
  }

  // 1) 누구인지, 진짜 로그인했는지 (카카오 라벨 또는 구글 등 연결 기록). 익명 계정은 마을을 만들 수 없다
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

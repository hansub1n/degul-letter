// 마을·눈사람을 Appwrite에 저장하고 불러온다.

import { ID, Permission, Query, Role, type Models } from "appwrite";
import { decodeSculpt, encodeSculpt } from "@/domains/snowman";
import { getAppwrite, TABLES } from "@/shared/lib/appwrite";
import { ensureUserId } from "@/shared/lib/session";
import type { SavedSnowman, SnowmanDraft, Village } from "./types";

type VillageRow = Models.Row & { name: string; code: string; ownerId: string };
type SnowmanRow = Models.Row & {
  villageId: string;
  authorId: string;
  authorName: string;
  x: number;
  y: number;
  balls: string;
  sculpt: string;
  letterId: string | null;
};

const toVillage = (r: VillageRow): Village => ({ id: r.$id, name: r.name, code: r.code, ownerId: r.ownerId });

const toSnowman = (r: SnowmanRow): SavedSnowman => {
  let balls: number[] = [];
  try {
    balls = (JSON.parse(r.balls) as unknown[]).filter((v): v is number => typeof v === "number");
  } catch {
    balls = [];
  }
  return {
    id: r.$id,
    authorId: r.authorId,
    authorName: r.authorName,
    x: r.x,
    y: r.y,
    balls,
    sculpt: decodeSculpt(r.sculpt),
    letterId: r.letterId || null,
  };
};

/** 내 것만 고치고 지울 수 있게: 누구나 읽기, 고치기·지우기는 나만 */
const ownedBy = (userId: string) => [
  Permission.read(Role.any()),
  Permission.update(Role.user(userId)),
  Permission.delete(Role.user(userId)),
];

// 공유 링크용 코드: 헷갈리는 글자(0/O, 1/l/I)는 뺀다
const CODE_CHARS = "abcdefghjkmnpqrstuvwxyz23456789";
function randomCode(length = 6): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => CODE_CHARS[b % CODE_CHARS.length]).join("");
}

export async function findMyVillage(): Promise<Village | null> {
  const userId = await ensureUserId();
  const { tables, databaseId } = getAppwrite();
  const { rows } = await tables.listRows<VillageRow>({
    databaseId,
    tableId: TABLES.villages,
    queries: [Query.equal("ownerId", userId), Query.limit(1)],
  });
  return rows[0] ? toVillage(rows[0]) : null;
}

export async function createVillage(name: string): Promise<Village> {
  const userId = await ensureUserId();
  const { tables, databaseId } = getAppwrite();
  // 코드가 우연히 겹치면(아주 드묾) 다른 코드로 몇 번 다시 시도한다
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const row = await tables.createRow<VillageRow>({
        databaseId,
        tableId: TABLES.villages,
        rowId: ID.unique(),
        data: { name, code: randomCode(), ownerId: userId },
        permissions: ownedBy(userId),
      });
      return toVillage(row);
    } catch (e) {
      if ((e as { code?: number }).code !== 409 || attempt === 2) throw e;
    }
  }
  throw new Error("마을을 만들지 못했어요");
}

export async function getVillageByCode(code: string): Promise<Village | null> {
  const { tables, databaseId } = getAppwrite();
  const { rows } = await tables.listRows<VillageRow>({
    databaseId,
    tableId: TABLES.villages,
    queries: [Query.equal("code", code), Query.limit(1)],
  });
  return rows[0] ? toVillage(rows[0]) : null;
}

export async function listSnowmen(villageId: string): Promise<SavedSnowman[]> {
  const { tables, databaseId } = getAppwrite();
  const { rows } = await tables.listRows<SnowmanRow>({
    databaseId,
    tableId: TABLES.snowmen,
    queries: [Query.equal("villageId", villageId), Query.limit(200)],
  });
  return rows.map(toSnowman);
}

export async function saveSnowman(
  villageId: string,
  authorName: string,
  draft: SnowmanDraft,
  letterId: string | null,
): Promise<SavedSnowman> {
  const userId = await ensureUserId();
  const { tables, databaseId } = getAppwrite();
  const row = await tables.createRow<SnowmanRow>({
    databaseId,
    tableId: TABLES.snowmen,
    rowId: ID.unique(),
    data: {
      villageId,
      authorId: userId,
      authorName,
      x: draft.x,
      y: draft.y,
      balls: JSON.stringify(draft.balls.map((r) => Math.round(r * 10) / 10)),
      sculpt: encodeSculpt(draft.sculpt),
      letterId,
    },
    permissions: ownedBy(userId),
  });
  return toSnowman(row);
}

export async function deleteSnowman(snowmanId: string): Promise<void> {
  const { tables, databaseId } = getAppwrite();
  await tables.deleteRow({ databaseId, tableId: TABLES.snowmen, rowId: snowmanId });
}

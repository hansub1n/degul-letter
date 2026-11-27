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
  /** 컬럼을 만들기 전에 저장된 행은 비어 있다 (= 보이는 상태) */
  hidden?: boolean | null;
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
    hidden: r.hidden === true,
  };
};

/**
 * 눈사람 권한: 누구나 읽기, 지우기는 만든 사람만. 고치기(update)는 아무에게도 주지 않는다.
 * 저장한 눈사람을 고치는 화면이 없고, 고치기를 열어 두면 작성자가 주인이 숨긴 눈사람(hidden)을 되돌리거나
 * 이름을 금칙어로 바꿀 수 있다. 숨기기는 서버(/api/snowmen/hide)가 서버 키로 한다.
 */
const snowmanPermissions = (userId: string) => [Permission.read(Role.any()), Permission.delete(Role.user(userId))];

/** 내 마을 조회는 내 계정이 필요해서 세션을 만든 뒤 한다 */
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

/**
 * 마을 만들기는 서버(/api/villages)가 한다. 카카오 로그인한 계정만, 한 계정에 하나만 만들 수 있다.
 * 브라우저는 "나는 이 사람이에요" 증명(JWT)만 보낸다.
 */
export async function createVillage(name: string): Promise<Village> {
  await ensureUserId();
  const { jwt } = await getAppwrite().account.createJWT();
  const res = await fetch("/api/villages", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
    body: JSON.stringify({ name }),
  });
  const data = (await res.json().catch(() => ({}))) as Partial<Village> & { message?: string };
  if (!res.ok || !data.id || !data.code || !data.name || !data.ownerId) {
    throw new Error(data.message ?? "마을을 만들지 못했어요");
  }
  return { id: data.id, name: data.name, code: data.code, ownerId: data.ownerId };
}

/** 마을 읽기는 누구나 읽기라 세션 없이 한다 */
export async function getVillageByCode(code: string): Promise<Village | null> {
  const { tables, databaseId } = getAppwrite();
  const { rows } = await tables.listRows<VillageRow>({
    databaseId,
    tableId: TABLES.villages,
    queries: [Query.equal("code", code), Query.limit(1)],
  });
  return rows[0] ? toVillage(rows[0]) : null;
}

/** 눈사람 목록도 세션 없이 읽는다 */
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
    permissions: snowmanPermissions(userId),
  });
  return toSnowman(row);
}

export async function deleteSnowman(snowmanId: string): Promise<void> {
  const { tables, databaseId } = getAppwrite();
  await tables.deleteRow({ databaseId, tableId: TABLES.snowmen, rowId: snowmanId });
}

/**
 * 마을 주인이 눈사람을 숨기거나 다시 보이게 한다. 행은 그대로 두고 hidden만 바뀐다.
 * 주인만 할 수 있어서, 브라우저는 "나는 이 사람이에요" 증명(JWT)을 들고 우리 서버(/api/snowmen/hide)에 부탁한다.
 */
export async function setSnowmanHidden(snowmanId: string, hidden: boolean): Promise<void> {
  await ensureUserId();
  const { jwt } = await getAppwrite().account.createJWT();
  const res = await fetch("/api/snowmen/hide", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
    body: JSON.stringify({ snowmanId, hidden }),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(data.message ?? "처리하지 못했어요");
  }
}

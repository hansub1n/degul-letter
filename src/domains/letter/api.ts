// 편지 저장·삭제. 편지에는 "읽기" 권한을 아무에게도 주지 않는다.
// 마을 주인도 쓴 사람도 브라우저에서는 읽을 수 없고, 12/25 이후 서버 함수가 주인에게만 보여 준다.

import { ID, Permission, Role } from "appwrite";
import { getAppwrite, TABLES } from "@/shared/lib/appwrite";
import { ensureUserId } from "@/shared/lib/session";
import { LETTER_MAX_LENGTH } from "./types";

/** 편지를 묻어 두고 편지 ID를 돌려준다 */
export async function createLetter(villageId: string, authorName: string, content: string): Promise<string> {
  const userId = await ensureUserId();
  const { tables, databaseId } = getAppwrite();
  const row = await tables.createRow({
    databaseId,
    tableId: TABLES.letters,
    rowId: ID.unique(),
    data: { villageId, authorId: userId, authorName, content: content.slice(0, LETTER_MAX_LENGTH) },
    // 읽기 권한 없음. 쓴 사람은 눈사람을 부술 때 편지도 지울 수 있게 지우기 권한만 준다.
    permissions: [Permission.delete(Role.user(userId))],
  });
  return row.$id;
}

export async function deleteLetter(letterId: string): Promise<void> {
  const { tables, databaseId } = getAppwrite();
  await tables.deleteRow({ databaseId, tableId: TABLES.letters, rowId: letterId });
}

/**
 * 12/25 이후 마을 주인이 편지를 연다.
 * 브라우저는 편지를 직접 읽을 수 없어서, "나는 이 사람이에요" 증명(JWT)을 들고 우리 서버(/api/letters/open)에 부탁한다.
 */
export async function openLetter(villageId: string, letterId: string): Promise<{ authorName: string; content: string }> {
  await ensureUserId();
  const { account } = getAppwrite();
  const { jwt } = await account.createJWT();
  // 개발 중 날짜 미리보기(?today=12-25)를 서버에도 알려 준다. 배포 버전 서버는 무시한다.
  const today = new URLSearchParams(window.location.search).get("today") ?? undefined;
  const res = await fetch("/api/letters/open", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
    body: JSON.stringify({ villageId, letterId, today }),
  });
  const data = (await res.json().catch(() => ({}))) as { authorName?: string; content?: string; message?: string };
  if (!res.ok || data.content === undefined) throw new Error(data.message ?? "편지를 열지 못했어요");
  return { authorName: data.authorName ?? "", content: data.content };
}

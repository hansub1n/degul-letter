// 서버 전용: 12/25 이후 마을 주인에게만 편지를 꺼내 준다.
// 편지 테이블에는 읽기 권한이 아무에게도 없어서, 여기서 서버 키(APPWRITE_API_KEY)로 대신 읽고
// 비밀 열쇠(LETTER_PRIVATE_KEY)로 봉인을 푼다.
// 브라우저 코드에서 import하면 안 된다 (서버 키가 필요하다). 그래서 index.ts로 내보내지 않는다.

import { Account, Client, TablesDB } from "node-appwrite";
import { isLetterOpen } from "./lib/dday";
import { openSeal } from "./lib/seal";

export class LetterAccessError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

function config() {
  const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
  const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
  const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
  const apiKey = process.env.APPWRITE_API_KEY;
  const letterKey = process.env.LETTER_PRIVATE_KEY;
  if (!endpoint || !projectId || !databaseId || !apiKey || !letterKey) {
    throw new LetterAccessError(500, "서버 설정이 비어 있어요");
  }
  return { endpoint, projectId, databaseId, apiKey, letterKey };
}

type Row = { $id: string } & Record<string, unknown>;

/**
 * jwt: 브라우저가 보낸 "나는 이 사람이에요" 증명 (Appwrite가 발급, 15분 유효)
 * now: 지금 시각 (개발 중 날짜 미리보기 때만 바뀐다)
 */
export async function openLetterForOwner(params: {
  jwt: string;
  villageId: string;
  letterId: string;
  now: number;
}): Promise<{ authorName: string; content: string }> {
  const { endpoint, projectId, databaseId, apiKey, letterKey } = config();

  // 1) 누가 요청했는지: 브라우저가 보낸 JWT로 Appwrite에 물어본다
  let userId: string;
  try {
    const asUser = new Client().setEndpoint(endpoint).setProject(projectId).setJWT(params.jwt);
    userId = (await new Account(asUser).get()).$id;
  } catch {
    throw new LetterAccessError(401, "다시 들어와 주세요");
  }

  const admin = new TablesDB(new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey));
  const getRow = async (tableId: string, rowId: string) => {
    try {
      return (await admin.getRow({ databaseId, tableId, rowId })) as unknown as Row;
    } catch {
      throw new LetterAccessError(404, "편지를 찾을 수 없어요");
    }
  };

  // 2) 마을 주인인지
  const village = await getRow("villages", params.villageId);
  if (village.ownerId !== userId) throw new LetterAccessError(403, "마을 주인만 열 수 있어요");

  // 3) 크리스마스가 됐는지 (한국 시간 12/25 00:00부터)
  if (!isLetterOpen(params.now)) throw new LetterAccessError(403, "12월 25일에 열 수 있어요");

  // 4) 그 마을에 온 편지인지 확인하고 꺼낸다
  const letter = await getRow("letters", params.letterId);
  if (letter.villageId !== params.villageId) throw new LetterAccessError(404, "편지를 찾을 수 없어요");

  // 5) 봉인(암호화)을 비밀 열쇠로 푼다. 봉인 전에 저장된 예전 편지는 그대로 나온다
  let content: string;
  try {
    content = await openSeal(String(letter.content), letterKey);
  } catch (e) {
    console.error(e);
    throw new LetterAccessError(500, "편지를 열지 못했어요");
  }
  return { authorName: String(letter.authorName), content };
}

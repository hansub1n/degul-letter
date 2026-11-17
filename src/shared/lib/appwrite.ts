// Appwrite 클라이언트. 앱 전체에서 하나만 만들어 함께 쓴다.

import { Account, Client, TablesDB } from "appwrite";
import { env } from "./env";

/** Appwrite 콘솔에서 만들 테이블 ID. 콘솔의 Table ID를 이 값과 똑같이 맞춘다. */
export const TABLES = {
  villages: "villages",
  snowmen: "snowmen",
  letters: "letters",
} as const;

let client: Client | null = null;

/** 처음 쓸 때 만든다. 환경 변수가 없어도 게임 화면은 뜨게 하려는 것이다. */
export function getAppwrite() {
  if (!client) {
    client = new Client().setEndpoint(env.appwriteEndpoint).setProject(env.appwriteProjectId);
  }
  return {
    client,
    account: new Account(client),
    tables: new TablesDB(client),
    databaseId: env.appwriteDatabaseId,
  };
}

// 서버 전용: 브라우저가 보낸 JWT로 "누구인지, 진짜 로그인한 계정인지"를 확인한다.
// 로그인 여부는 사용자가 스스로 바꿀 수 없는 것만 본다:
//  - 카카오: 로그인 서버가 서버 키로 붙이는 `kakao` 라벨 (라벨은 브라우저에서 못 바꾼다)
//  - 구글 등 Appwrite가 직접 하는 로그인: 계정에 남는 연결 기록(identity)
// prefs(계정 설정값)는 사용자가 브라우저에서 고칠 수 있어서 판단에 쓰지 않는다.
// 서버 코드에서만 import한다 (브라우저 번들에 넣지 않는다).

import { Account, Client } from "node-appwrite";

export const KAKAO_LABEL = "kakao";

export async function verifyAccount(jwt: string): Promise<{ userId: string; loggedIn: boolean } | null> {
  const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
  const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
  if (!endpoint || !projectId) return null;
  try {
    const account = new Account(new Client().setEndpoint(endpoint).setProject(projectId).setJWT(jwt));
    const user = await account.get();
    if (user.labels.includes(KAKAO_LABEL)) return { userId: user.$id, loggedIn: true };
    const { total } = await account.listIdentities();
    return { userId: user.$id, loggedIn: total > 0 };
  } catch {
    return null;
  }
}

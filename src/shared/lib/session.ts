// 로그인 없이 쓰는 익명 계정. 처음 들어온 브라우저에 Appwrite가 임시 계정을 만들어 준다.
// 마을 주인인지, 내가 만든 눈사람인지 구분하는 데 쓴다. 카카오 로그인하면 이 계정이 카카오에 이어진다.

import { getAppwrite } from "./appwrite";

let pending: Promise<string> | null = null;

/** 내 계정 ID. 세션이 없으면 익명 세션을 만든다. 여러 곳에서 동시에 불러도 한 번만 만든다. */
export function ensureUserId(): Promise<string> {
  if (!pending) {
    pending = (async () => {
      const { account } = getAppwrite();
      try {
        return (await account.get()).$id;
      } catch {
        await account.createAnonymousSession();
        return (await account.get()).$id;
      }
    })();
    // 실패하면 다음에 다시 시도할 수 있게 비운다
    pending.catch(() => {
      pending = null;
    });
  }
  return pending;
}

/** 로그인으로 계정이 바뀐 뒤 부른다. 다음 ensureUserId()가 새 계정을 다시 읽는다. */
export function forgetUserId(): void {
  pending = null;
}

// 로그인 없이 쓰는 익명 계정. 처음 들어온 브라우저에 Appwrite가 임시 계정을 만들어 준다.
// 마을 주인인지, 내가 만든 눈사람인지 구분하는 데 쓴다. 카카오 로그인하면 이 계정이 카카오에 이어진다.

import { AppwriteException } from "appwrite";
import { getAppwrite } from "./appwrite";

/** 익명 세션 생성이 한도(429)에 걸렸을 때. message는 그대로 화면에 보여 줘도 된다. */
export class SessionRateLimitError extends Error {
  constructor() {
    super("잠시 후 다시 시도해 주세요");
    this.name = "SessionRateLimitError";
  }
}

let pending: Promise<string> | null = null;

/**
 * 이미 있는 세션의 계정 ID. 세션이 없으면 만들지 않고 null.
 * 마을·눈사람 읽기(누구나 읽기 가능)처럼 세션이 필요 없는 화면에서, 내가 누구인지만 알아볼 때 쓴다.
 */
export async function peekUserId(): Promise<string | null> {
  try {
    return (await getAppwrite().account.get()).$id;
  } catch (e) {
    if (!(e instanceof AppwriteException && e.code === 401)) console.warn(e);
    return null;
  }
}

/** 내 계정 ID. 세션이 없으면 익명 세션을 만든다. 쓰기가 필요한 순간에만 부른다. 여러 곳에서 동시에 불러도 한 번만 만든다. */
export function ensureUserId(): Promise<string> {
  if (!pending) {
    pending = (async () => {
      const { account } = getAppwrite();
      try {
        return (await account.get()).$id;
      } catch {
        try {
          await account.createAnonymousSession();
        } catch (e) {
          if (e instanceof AppwriteException && e.code === 429) throw new SessionRateLimitError();
          throw e;
        }
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

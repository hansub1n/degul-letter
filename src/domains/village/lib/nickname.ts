// 닉네임(마을 이름·눈사람 이름표·편지 보낸 사람) 규칙. 화면과 서버(마을 만들기)가 같은 규칙을 쓴다.
// - 2~8자
// - 한글·영문·숫자만 (띄어쓰기·기호·이모지 불가). 한글은 입력 중에 생기는 자모(ㄱ, ㅏ)도 받는다
// - 같은 닉네임을 여러 사람이 써도 된다 (중복 검사 없음)
// - 금칙어(욕설·성적인 말, 운영자 사칭)가 들어 있으면 안 된다. 우회(fxuk, 시1발, f.u.c.k)도 막는다 (shared/lib/profanity.ts)

import { profanityProblem } from "@/shared/lib/profanity";
import { NICKNAME_MAX } from "../types";

export const NICKNAME_MIN = 2;

const ALLOWED = /^[가-힣ㄱ-ㅎㅏ-ㅣA-Za-z0-9]+$/;

/** 규칙에 어긋나면 이유를, 괜찮으면 null. 빈 칸은 버튼을 막는 쪽에서 다루므로 null */
export function nicknameProblem(raw: string): string | null {
  const name = raw.trim();
  if (!name) return null;
  // 기호로 쪼갠 우회(f.u.c.k)도 "쓸 수 없는 단어"로 안내하려고 글자 규칙보다 먼저 본다
  const banned = profanityProblem(name, "name");
  if (banned) return banned;
  if (!ALLOWED.test(name)) return "한글, 영문, 숫자만 쓸 수 있어요";
  const length = [...name].length;
  if (length < NICKNAME_MIN || length > NICKNAME_MAX) return `${NICKNAME_MIN}~${NICKNAME_MAX}자로 써 주세요`;
  return null;
}

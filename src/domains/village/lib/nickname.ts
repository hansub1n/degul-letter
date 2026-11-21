// 닉네임(마을 이름·눈사람 이름표·편지 보낸 사람) 규칙. 화면과 서버(마을 만들기)가 같은 규칙을 쓴다.
// - 2~8자
// - 한글·영문·숫자만 (띄어쓰기·기호·이모지 불가). 한글은 입력 중에 생기는 자모(ㄱ, ㅏ)도 받는다
// - 같은 닉네임을 여러 사람이 써도 된다 (중복 검사 없음)
// - 금칙어(욕설·성적인 말, 운영자 사칭)가 들어 있으면 안 된다

import { NICKNAME_MAX } from "../types";

export const NICKNAME_MIN = 2;

const ALLOWED = /^[가-힣ㄱ-ㅎㅏ-ㅣA-Za-z0-9]+$/;

/**
 * 금칙어. 닉네임 안에 들어 있기만 해도 막는다 (영문은 대소문자 구분 없이).
 * 욕설·성적인 말과, 운영자로 오해할 수 있는 이름.
 */
const BANNED_WORDS = [
  // 욕설
  "시발", "씨발", "씨빨", "시바알", "ㅅㅂ", "ㅆㅂ", "병신", "븅신", "ㅂㅅ", "존나", "ㅈㄴ",
  "좆", "좃", "새끼", "쌔끼", "썅", "미친놈", "미친년", "닥쳐", "꺼져", "지랄", "ㅈㄹ",
  "애미", "애비", "느금", "니미", "엠창", "fuck", "shit", "bitch",
  // 성적인 말
  "섹스", "쎅스", "자지", "보지", "sex", "porn",
  // 운영자 사칭
  "운영자", "운영진", "관리자", "admin",
];

/** 규칙에 어긋나면 이유를, 괜찮으면 null. 빈 칸은 버튼을 막는 쪽에서 다루므로 null */
export function nicknameProblem(raw: string): string | null {
  const name = raw.trim();
  if (!name) return null;
  if (!ALLOWED.test(name)) return "한글, 영문, 숫자만 쓸 수 있어요";
  const length = [...name].length;
  if (length < NICKNAME_MIN || length > NICKNAME_MAX) return `${NICKNAME_MIN}~${NICKNAME_MAX}자로 써 주세요`;
  const lower = name.toLowerCase();
  if (BANNED_WORDS.some((word) => lower.includes(word))) return "쓸 수 없는 단어가 들어 있어요";
  return null;
}

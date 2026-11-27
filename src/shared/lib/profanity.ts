// 금칙어 검사. 마을 이름·눈사람 닉네임·편지 본문이 같은 규칙을 쓴다.
// 서버(마을 만들기)와 브라우저가 함께 쓰므로 서버 전용·브라우저 전용 코드를 넣지 않는다.
//
// 걸러 내는 순서
// 1. 소문자로 바꾸고(전각 영문도 일반 문자로), 보이지 않는 글자를 지운다
// 2. 숫자·기호로 바꿔 쓴 영문을 되돌린다 (1→i, 0→o, @→a ...) → 영문 검사용
// 3. 한글만 남긴다 (시1발, 시.발 → 시발) → 한글 검사용
// 4. 같은 글자가 이어지면 하나로 줄인다 (fuuuck → fuck)
// 5. 금칙어가 들어 있는지 본다
//
// 일반 단어를 너무 넓게 막지 않으려고, 편지 본문은 띄어쓰기를 남겨 단어 단위로 보고
// (f u c k 처럼 한 글자씩 띄어 쓴 것만 이어 붙인다), 일상 표현과 겹치는 말은 제외한다.

export const PROFANITY_MESSAGE = "쓸 수 없는 단어가 들어 있어요";

/** 욕설·성적인 말. 마을 이름·닉네임·편지 본문 모두에 적용 */
const ABUSE_WORDS = [
  // 욕설
  "시발", "씨발", "씨빨", "시바알", "시팔", "씨팔", "씨벌", "ㅅㅂ", "ㅆㅂ", "병신", "븅신", "ㅂㅅ", "존나", "ㅈㄴ",
  "좆", "좃", "새끼", "쌔끼", "썅", "미친놈", "미친년", "지랄", "ㅈㄹ",
  "애미", "애비", "느금", "니미", "엠창", "fuck", "shit", "bitch",
  // 잘 쓰이는 우회 (영문 철자 변형, 한글을 영문 자판으로 친 것)
  "fck", "fxuk", "fuxk", "phuck", "tlqkf", "qudtls",
  // 성적인 말
  "섹스", "쎅스", "sex", "porn",
];

/**
 * 일상 표현과 겹쳐서 편지 본문에서는 검사하지 않는 말 ("보지 못했어", "자지 않고", "불이 꺼져", "닥쳐올").
 * 닉네임·마을 이름은 짧고 문장이 아니라서 그대로 막는다.
 */
const NAME_ONLY_WORDS = ["자지", "보지", "꺼져", "닥쳐"];

/** 운영자 사칭. 이름에만 적용 (편지에 "관리자"라고 쓰는 건 사칭이 아니다) */
const IMPERSONATION_WORDS = ["운영자", "운영진", "관리자", "admin"];

/** 통째로 같을 때만 막는 말 (일반 단어 안에 들어 있을 수 있어서: fukuoka) */
const EXACT_WORDS = ["fuk"];

/** 금칙어가 들어 있어도 쓰는 말 (본문에서 지운 뒤 검사한다). 띄어 써도 같다 */
const ALLOWED_PHRASES = [
  "시발점", "시발역", "애비뉴",
  "새끼 손가락", "새끼 발가락", "새끼 고양이", "새끼 강아지", "새끼 새", "새끼 오리", "새끼 토끼",
  "새끼 곰", "새끼 사슴", "새끼 돼지", "새끼 호랑이", "새끼 사자",
  "essex", "sussex", "middlesex",
];

const LEET: Record<string, string> = {
  "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", $: "s", "!": "i", "|": "i",
};

/** 같은 글자가 이어지면 하나로 (fuuuck → fuck, 시이이발은 그대로) */
function squash(text: string): string {
  return text.replace(/(.)\1+/gu, "$1");
}

const compressed = (words: string[]) => words.map(squash);

const ABUSE = compressed(ABUSE_WORDS);
const NAME_ONLY = compressed(NAME_ONLY_WORDS);
const IMPERSONATION = compressed(IMPERSONATION_WORDS);

const ALLOWED_PATTERN = new RegExp(
  ALLOWED_PHRASES.map((phrase) => phrase.split(" ").join("\\s*")).join("|"),
  "g",
);

const LATIN_KEEP = /[^a-z가-힣ㄱ-ㅎㅏ-ㅣ]/g;
const HANGUL_KEEP = /[^가-힣ㄱ-ㅎㅏ-ㅣ]/g;
/** 전각 영문·숫자·기호(ｆｕｃｋ). NFKC는 ㅅㅂ 같은 자모까지 바꿔 버려서 쓰지 않는다 */
const FULLWIDTH = /[\uff01-\uff5e]/g;
const INVISIBLE = /[\u200b-\u200f\u2060\ufeff\u00ad]/g;

/** 한 덩어리를 검사용 글자로: [영문 검사용, 한글 검사용] */
function cleaned(chunk: string): [string, string] {
  const leet = [...chunk].map((ch) => LEET[ch] ?? ch).join("");
  return [leet.replace(LATIN_KEEP, ""), chunk.replace(HANGUL_KEEP, "")];
}

/** 띄어쓰기로 나뉜 글자가 모두 한 글자씩이면 이어 붙인다 (f u c k, 시 발) */
function joinSingles(chunks: string[]): string[] {
  const out: string[] = [];
  let run = "";
  for (const chunk of chunks) {
    if (!chunk) continue;
    if ([...chunk].length === 1) {
      run += chunk;
      continue;
    }
    if (run) out.push(run);
    run = "";
    out.push(chunk);
  }
  if (run) out.push(run);
  return out;
}

export type ProfanityKind =
  /** 마을 이름·닉네임: 띄어쓰기와 기호를 다 무시하고, 운영자 사칭과 일상어 겹침도 막는다 */
  | "name"
  /** 편지 본문: 단어 단위로 보고, 일상 표현과 겹치는 말은 검사하지 않는다 */
  | "text";

/** 금칙어가 들어 있는지 */
export function hasProfanity(raw: string, kind: ProfanityKind): boolean {
  const base = raw.replace(FULLWIDTH, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0)).toLowerCase().replace(INVISIBLE, "");
  const text = kind === "text" ? base.replace(ALLOWED_PATTERN, " ") : base;
  const chunks = kind === "name" ? [text.replace(/\s+/g, "")] : text.split(/\s+/);

  const latin: string[] = [];
  const hangul: string[] = [];
  for (const chunk of chunks) {
    const [a, b] = cleaned(chunk);
    latin.push(a);
    hangul.push(b);
  }
  const candidates = [...joinSingles(latin), ...joinSingles(hangul)].map(squash);

  const words = kind === "name" ? [...ABUSE, ...NAME_ONLY, ...IMPERSONATION] : ABUSE;
  return candidates.some(
    (candidate) => words.some((word) => candidate.includes(word)) || EXACT_WORDS.includes(candidate),
  );
}

/** 걸리면 안내 문구, 괜찮으면 null */
export function profanityProblem(raw: string, kind: ProfanityKind): string | null {
  return hasProfanity(raw, kind) ? PROFANITY_MESSAGE : null;
}

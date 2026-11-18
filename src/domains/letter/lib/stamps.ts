// 편지지 오른쪽 위 우표 (25x25 도트). 편지마다 letterId로 하나를 고른다.
// 같은 편지는 언제 열어도 같은 우표가 나온다 (Math.random 아님).
// 글자 한 개 = 도트 한 칸. "." = 투명 (톱니 구멍).

export const STAMP_PALETTE: Record<string, string> = {
  w: "#FFFFFF", // 우표 종이
  k: "#2A2350", // ink (밤하늘)
  e: "#A9B8D6", // snow-edge
  s: "#DCE5F2", // snow-shade
  S: "#BFD9F2", // sky
  r: "#C94B42", // roof
  R: "#A63A33", // roof-shade
  g: "#3B7660", // pine
  G: "#2E5E4B", // pine-shade
  l: "#4C8C6E", // pine-light
  b: "#5C3A24", // wood
  y: "#FFC94D", // gold
  Y: "#D9A032", // gold-shade
  c: "#F4E4C8", // wall
  f: "#8A6A4A", // wall-frame
  o: "#FFD27A", // window
};

export const STAMPS = {
  pine: [
    "w.w.w.w.w.w.w.w.w.w.w.w.w",
    ".wwwwwwwwwwwwwwwwwwwwwww.",
    "wwwwwwwwwwwwwwwwwwwwwwwww",
    ".wwrrrrrrrrrrrrrrrrrrrww.",
    "wwwrSSSSSSSSySSSSSSSSrwww",
    ".wwrSSSSSSSyyySSSSSSSrww.",
    "wwwrSSwSSSSSySSSSSSSSrwww",
    ".wwrSSSSSSSwwwSSSSSSSrww.",
    "wwwrSSSSSSwlggwSSwSSSrwww",
    ".wwrSSSSSSllggGSSSSSSrww.",
    "wwwrSSSSSwlwwwGwSSSSSrwww",
    ".wwrSSSSwwlgggGwSSSSSrww.",
    "wwwrSSSSlllggggGGSSSSrwww",
    ".wwrSSSwllwwwwwGGwSSSrww.",
    "wwwrSSSSwllggggGwSSSSrwww",
    ".wwrSSSllllggggGGGSSSrww.",
    "wwwrSwllllggggggGGGwSrwww",
    ".wwrSSSSSSSbbbSSSSSSSrww.",
    "wwwrwwwwwwwssswwwwwwwrwww",
    ".wwrwwwwwwwwwwwwwwwwwrww.",
    "wwwreeeeeeeeeeeeeeeeerwww",
    ".wwrrrrrrrrrrrrrrrrrrrww.",
    "wwwwwwwwwwwwwwwwwwwwwwwww",
    ".wwwwwwwwwwwwwwwwwwwwwww.",
    "w.w.w.w.w.w.w.w.w.w.w.w.w",
  ],
  star: [
    "w.w.w.w.w.w.w.w.w.w.w.w.w",
    ".wwwwwwwwwwwwwwwwwwwwwww.",
    "wwwwwwwwwwwwwwwwwwwwwwwww",
    ".wwrrrrrrrrrrrrrrrrrrrww.",
    "wwwrkkkkkkkkkkkkkkkkkrwww",
    ".wwrkwkkkkkkkkkkkkkkkrww.",
    "wwwrkkkkkkkkkkkkkkwkkrwww",
    ".wwrkkkkkkkkykkkkkkkkrww.",
    "wwwrkkkkwkkkykkkkkkkkrwww",
    ".wwrkkkkkkkyyykkkkkkkrww.",
    "wwwrkkkyyyyyyyyyyykkkrwww",
    ".wwrkkkkyyyyyyyyYkkkkrww.",
    "wwwrkkkkkyyyyyyYkkkkkrwww",
    ".wwrkkkkkyyyyyyYkkkkkrww.",
    "wwwrkkkkyyyykyyyYkkkkrwww",
    ".wwrkkkkyyykkkyYYkkkkrww.",
    "wwwrkkkyykkkkkkkYYkwkrwww",
    ".wwrkkwkkkkkkkkkkkkkkrww.",
    "wwwrkkkkkkkkkkkkkkkkkrwww",
    ".wwrkkkkkkkkkkkkwkkkkrww.",
    "wwwrkkkkkkkkkkkkkkkkkrwww",
    ".wwrrrrrrrrrrrrrrrrrrrww.",
    "wwwwwwwwwwwwwwwwwwwwwwwww",
    ".wwwwwwwwwwwwwwwwwwwwwww.",
    "w.w.w.w.w.w.w.w.w.w.w.w.w",
  ],
  house: [
    "w.w.w.w.w.w.w.w.w.w.w.w.w",
    ".wwwwwwwwwwwwwwwwwwwwwww.",
    "wwwwwwwwwwwwwwwwwwwwwwwww",
    ".wwgggggggggggggggggggww.",
    "wwwgSSSSSSSSSSSSSSSSSgwww",
    ".wwgSSSSSSSSSSSwwSSSSgww.",
    "wwwgSSSSSSSSSSSffSSSSgwww",
    ".wwgSSSSSSwwwwwffSSSSgww.",
    "wwwgSSSSSwwwwwwwfSSSSgwww",
    ".wwgSSSSrwrwrwRwRSSSSgww.",
    "wwwgSSSrrrrrrrRRRRSSSgwww",
    ".wwgSSrrrrrrrrRRRRRSSgww.",
    "wwwgSrrrrrrrrrRRRRRRSgwww",
    ".wwgSSSfcccccccccfSSSgww.",
    "wwwgSSSfcooccbbccfSSSgwww",
    ".wwgSSSfcooccbbccfSSSgww.",
    "wwwgSSSfcccccbbccfSSSgwww",
    ".wwgwwwfffffffffffwwwgww.",
    "wwwgwwwwwwwwwwwwwwwwwgwww",
    ".wwgwwwwwwwwwwwwwwwwwgww.",
    "wwwgeeeeeeeeeeeeeeeeegwww",
    ".wwgggggggggggggggggggww.",
    "wwwwwwwwwwwwwwwwwwwwwwwww",
    ".wwwwwwwwwwwwwwwwwwwwwww.",
    "w.w.w.w.w.w.w.w.w.w.w.w.w",
  ],
  snowflake: [
    "w.w.w.w.w.w.w.w.w.w.w.w.w",
    ".wwwwwwwwwwwwwwwwwwwwwww.",
    "wwwwwwwwwwwwwwwwwwwwwwwww",
    ".wwkkkkkkkkkkkkkkkkkkkww.",
    "wwwkrrrrrrrrrrrrrrrrrkwww",
    ".wwkrrrrrrrrrrrrrrrrrkww.",
    "wwwkrrrrrrrrwrrrrrrrrkwww",
    ".wwkrrrrrwrwwwrwrrrrrkww.",
    "wwwkrrrrwrrrwrrrwrrrrkwww",
    ".wwkrrrwrwrrwrrwrwrrrkww.",
    "wwwkrrrrrrwrwrwrrrrrrkwww",
    ".wwkrrrwrrrwwwrrrwrrrkww.",
    "wwwkrrwwwwwwwwwwwwwrrkwww",
    ".wwkrrrwrrrwwwrrrwrrrkww.",
    "wwwkrrrrrrwrwrwrrrrrrkwww",
    ".wwkrrrwrwrrwrrwrwrrrkww.",
    "wwwkrrrrwrrrwrrrwrrrrkwww",
    ".wwkrrrrrwrwwwrwrrrrrkww.",
    "wwwkrrrrrrrrwrrrrrrrrkwww",
    ".wwkrrrrrrrrrrrrrrrrrkww.",
    "wwwkrrrrrrrrrrrrrrrrrkwww",
    ".wwkkkkkkkkkkkkkkkkkkkww.",
    "wwwwwwwwwwwwwwwwwwwwwwwww",
    ".wwwwwwwwwwwwwwwwwwwwwww.",
    "w.w.w.w.w.w.w.w.w.w.w.w.w",
  ],
} as const;

export type StampName = keyof typeof STAMPS;
const NAMES = Object.keys(STAMPS) as StampName[];

/** letterId(문자열)를 해시해서 우표 하나를 고른다. 같은 id면 항상 같은 우표. */
export function stampFor(letterId: string): StampName {
  let h = 2166136261;
  for (let i = 0; i < letterId.length; i++) {
    h ^= letterId.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return NAMES[(h >>> 0) % NAMES.length];
}

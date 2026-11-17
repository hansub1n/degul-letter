// 도트 아이콘. 글자 한 개가 도트 한 칸이고, 글자마다 색이 정해져 있다.
// 도구 아이콘은 기호 대신 "게임 속 물건"(끌, 눈덩이, 털장갑, 망치)을 마을 그림과 같은 색으로 그린다.

// 흰 버튼 위에서도 또렷하도록 테두리는 모두 ✕와 같은 진한 남색으로 쓴다
const PALETTE: Record<string, string> = {
  O: "#2A2350", // 진한 남색 (✕, ✓)
  v: "#A9B8D6", // 눈 테두리 하늘색 (장식)
  o: "#2A2350", // 물건 테두리
  w: "#FFFFFF",
  s: "#C9D5EA", // 눈 그늘 (봉투 아래 그늘)
  e: "#2A2350", // 눈덩이 테두리
  l: "#E3E8F3", // 쇠 밝은 면
  h: "#B8C2D8", // 쇠
  b: "#B07A48", // 나무
  B: "#7A4E2C", // 나무 그늘
  f: "#FFE2C8", // 손
  F: "#F2C29E",
  r: "#E0574F", // 털장갑
  R: "#B23A34",
  p: "#FF8F87",
};

const ICONS = {
  close: [
    "OO......OO",
    "OOO....OOO",
    ".OOO..OOO.",
    "..OOOOOO..",
    "...OOOO...",
    "...OOOO...",
    "..OOOOOO..",
    ".OOO..OOO.",
    "OOO....OOO",
    "OO......OO",
  ],
  check: [
    ".........OO",
    "........OOO",
    ".......OOO.",
    "OO....OOO..",
    "OOO..OOO...",
    ".OOOOOO....",
    "..OOOO.....",
    "...OO......",
  ],
  // 깎기: 쇠 날 + 나무 손잡이 끌
  carve: [
    "..........oo",
    ".........olo",
    "........olho",
    ".......olho.",
    "......ohho..",
    ".....oooo...",
    "....obBo....",
    "...obBo.....",
    "..obBo......",
    ".obBo.......",
    "obBo........",
    "ooo.........",
  ],
  // 붙이기: 마을에 굴러다니는 눈덩이 (왼쪽 위에서 빛)
  add: [
    "...eeeee...",
    ".eewwwwwee.",
    ".ewwwwwwwe.",
    "ewwwwwwwwse",
    "ewwwwwwwsse",
    "ewwwwwwssse",
    "ewwwwwsssse",
    "ewwwsssssse",
    ".essssssse.",
    ".eesssssee.",
    "...eeeee...",
  ],
  // 누르기: 꾹 누르는 손가락
  press: [
    "....oo......",
    "...offo.....",
    "...offo.....",
    "...offo.....",
    "...offoooo..",
    ".ooooffoffoo",
    "offoffffffFo",
    "offfffffffFo",
    ".offffffffFo",
    ".offfffffFFo",
    "..offffFFFo.",
    "...ooooooo..",
  ],
  // 문지르기: 슥슥 문지르는 빨간 털장갑 (왼쪽 줄은 움직임 표시)
  smooth: [
    "......ooooo...",
    ".....oprrrro..",
    "oo...orrrrro..",
    "..oo.orrrrro..",
    "..oprorrrrro..",
    "..orrorrrrro..",
    "...orrrrrrro..",
    "....orrrrrRo..",
    "oo..oRrrrRRo..",
    "....owwwwwwo..",
    "....owswswso..",
    "....oooooooo..",
  ],
  // 부수기: 캐릭터가 휘두르는 망치와 같은 그림
  hammer: [
    "ooooooo",
    "ollllho",
    "ohhhhho",
    "ohhhhho",
    "ooooooo",
    "..obo..",
    "..obo..",
    "..obo..",
    "..obo..",
    "..oBo..",
    "..ooo..",
  ],
  undo: [
    "...o........",
    "..oo........",
    ".ooooooooo..",
    "oooooooooooo",
    ".ooo......oo",
    "..oo......oo",
    "...o......oo",
    "..........oo",
    ".........ooo",
    "...ooooooooo",
    "...oooooooo.",
  ],
  // 편지: 빨간 밀랍 봉인이 찍힌 봉투 (우체통 속 봉투와 같은 모양)
  letter: [
    "oooooooooooo",
    "ooowwwwwwooo",
    "owwoowwoowwo",
    "owwwrprrwwwo",
    "owwwrrrRwwwo",
    "owwwwRRwwwwo",
    "owwwwwwwwwwo",
    "osssssssssso",
    "oooooooooooo",
  ],
  // 링크 보내기: 종이비행기
  send: [
    "..........oo",
    "........oowo",
    "......oowwwo",
    "....oowwwwo.",
    "..oowwwwwwo.",
    "oowwwwwwwo..",
    "..oowwwwwo..",
    "....oowwso..",
    ".....oowso..",
    "......oooo..",
  ],
  // 작은 눈송이 (제목 장식)
  snowflake: [
    "....v....",
    ".v..v..v.",
    "..v.v.v..",
    "...vvv...",
    "vvvvvvvvv",
    "...vvv...",
    "..v.v.v..",
    ".v..v..v.",
    "....v....",
  ],
  // 페이지 넘기기 화살표
  prev: ["...oo", "..ooo", ".oooo", "ooooo", ".oooo", "..ooo", "...oo"],
  next: ["oo...", "ooo..", "oooo.", "ooooo", "oooo.", "ooo..", "oo..."],
  // 붓 크기: 꺾쇠 안에 작은 눈 / 큰 눈
  brushSmall: [
    "ooo......ooo",
    "o..........o",
    "o..........o",
    "............",
    "............",
    ".....oo.....",
    ".....oo.....",
    "............",
    "............",
    "o..........o",
    "o..........o",
    "ooo......ooo",
  ],
  brushLarge: [
    "ooo......ooo",
    "o..........o",
    "o..eeeeee..o",
    "...ewwwwse..",
    "...ewwwsse..",
    "...ewwssse..",
    "...ewsssse..",
    "...essssse..",
    "...eeeeeee..",
    "o..........o",
    "o..........o",
    "ooo......ooo",
  ],
} satisfies Record<string, string[]>;

export type PixelIconName = keyof typeof ICONS;

type Props = {
  name: PixelIconName;
  /** 도트 한 칸의 크기(px) */
  scale?: number;
  className?: string;
};

export function PixelIcon({ name, scale = 3, className }: Props) {
  const rows = ICONS[name];
  const width = Math.max(...rows.map((r) => r.length));
  const rects: Array<{ x: number; y: number; w: number; color: string }> = [];
  // 같은 색이 가로로 이어지면 사각형 하나로 합친다
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const color = PALETTE[row[x]];
      if (!color) {
        x++;
        continue;
      }
      let end = x + 1;
      while (end < row.length && row[end] === row[x]) end++;
      rects.push({ x, y, w: end - x, color });
      x = end;
    }
  });

  return (
    <svg
      aria-hidden
      width={width * scale}
      height={rows.length * scale}
      viewBox={`0 0 ${width} ${rows.length}`}
      shapeRendering="crispEdges"
      className={className}
    >
      {rects.map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height={1} fill={r.color} />
      ))}
    </svg>
  );
}

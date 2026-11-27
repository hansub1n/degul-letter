// 도트 아이콘. 글자 한 개가 도트 한 칸이고, 글자마다 색이 정해져 있다.
// 도구 아이콘은 기호 대신 "게임 속 물건"(끌, 눈덩이, 털장갑, 망치)을 마을 그림과 같은 색으로 그린다.

// 색은 모두 globals.css 토큰을 따른다(화면 코드에 hex를 쓰지 않는다).
// 모든 아이콘은 "속이 채워진 덩어리 + 1px --ink 외곽"으로 무게를 맞춘다.
// 기호 아이콘(✕, ✓, 넘기기)은 속까지 --ink로 꽉 채운 덩어리다. 흰 버튼과 빨간 버튼 위에서 같은 색으로 읽힌다.
// 비활성 버튼 안에서는 globals.css가 --ink를 --muted로 바꿔 아이콘도 함께 흐려진다.
const PALETTE: Record<string, string> = {
  o: "var(--ink)", // 물건 외곽선
  e: "var(--ink)", // 눈덩이 외곽선
  v: "var(--snow-edge)", // 눈 테두리 하늘색 (장식)
  w: "var(--snow)",
  s: "var(--paper-line)", // 눈 그늘 (봉투 아래 그늘)
  l: "var(--snow-shade)", // 쇠 밝은 면
  h: "var(--path-deep)", // 쇠
  b: "var(--wood-mid)", // 나무
  B: "var(--wood)", // 나무 그늘
  f: "var(--hero-skin)", // 손
  F: "var(--wall-shade)",
  r: "var(--berry)", // 털장갑, 밀랍 봉인, 우체통
  R: "var(--roof-shade)",
  p: "var(--hero-hat)",
  g: "var(--gold)", // 별, 자물쇠
  G: "var(--gold-shade)",
  n: "var(--pine-light)", // 호랑가시 잎
  N: "var(--pine-shade)",
  P: "var(--paper)", // 편지지 (열린 봉투 속)
  L: "var(--paper-line)",
  c: "var(--sky)", // 우표 하늘색 면
  m: "var(--muted)", // 소인
  y: "var(--window)", // 집 안 불빛
  Y: "var(--window-light)",
};

const ICONS = {
  // 닫기: 속까지 남색(--ink)으로 꽉 채운 ✕ 도트. 흰 버튼과 빨간 버튼 위에서 모두 진하게 읽힌다
  close: [
    "oo......oo",
    "ooo....ooo",
    ".ooo..ooo.",
    "..oooooo..",
    "...oooo...",
    "...oooo...",
    "..oooooo..",
    ".ooo..ooo.",
    "ooo....ooo",
    "oo......oo",
  ],
  check: [
    ".........oo",
    "........ooo",
    ".......ooo.",
    "oo....ooo..",
    "ooo..ooo...",
    ".oooooo....",
    "..oooo.....",
    "...oo......",
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
  // 되돌리기: 흰 면 + 아랫줄 그늘 + 남색 외곽의 굽은 화살표 (다른 채운 아이콘과 같은 무게)
  undo: [
    "...o........",
    "..owo.......",
    ".owwoooooo..",
    "owwwwwwwwwo.",
    "oswwssssswwo",
    ".oswooooowwo",
    "..oso...owwo",
    "...o....owwo",
    "....ooooowwo",
    "...owwwwwwso",
    "...osssssso.",
    "....oooooo..",
  ],
  // 봉투(편지): 빨간 밀랍 봉인이 찍힌 봉투 (우체통 속 봉투와 같은 모양)
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
  // 공유: 아이폰식. 위로 올라가는 화살표와 아래가 둥근 열린 쟁반. 빨간 버튼 위에서 흰 모양으로 읽히게 흰 속 + 남색 외곽
  share: [
    ".....oo.....",
    "....owwo....",
    "...owwwwo...",
    "..owwwwwwo..",
    "...oowwoo...",
    ".o..owwo..o.",
    "owo.owwo.owo",
    "owo.owwo.owo",
    "owo..oo..owo",
    "owoooooooowo",
    ".owwwwwwwwo.",
    "..oooooooo..",
  ],
  // 집 로그아웃: 반쯤 열린 문 안에서 불빛이 새어 나온다. 왼쪽 문틀이 무거워서 한 칸 오른쪽으로 옮겨 가운데로 보이게 한다
  houseDoor: [
    ".oooooooo...",
    ".oYYyyyyoo..",
    ".oYyyyyyobo.",
    ".oyyyyyyobbo",
    ".oyyyyyyobbo",
    ".oyyyyyyogbo",
    ".oyyyyyyobbo",
    ".oyyyyyyobbo",
    ".oyyyyyyobo.",
    ".oyyyyyyoo..",
    ".oooooooo...",
  ],
  // 우체통: 빨간 통 + 투입구 + 나무 기둥
  mailbox: [
    "..oooooooo..",
    ".orrrrrrrro.",
    "orrrrrrrrrro",
    "orooooooooro",
    "orrrrrrrrrro",
    "orrrrrrrrrro",
    "oRRRRRRRRRRo",
    "oooooooooooo",
    "....obbo....",
    "....obbo....",
    "....obBo....",
    "...oooooo...",
  ],
  // 잠김: 금색 자물쇠
  lock: [
    "....oooo....",
    "...o....o...",
    "...o....o...",
    "...o....o...",
    ".oooooooooo.",
    ".oggggggggo.",
    ".ogggoogggo.",
    ".ogggoogggo.",
    ".oggggggggo.",
    ".oGGGGGGGGo.",
    ".oooooooooo.",
  ],
  // 우체통 격자의 큰 봉투 (24x22): 봉인된 봉투 = 흰 면 + 남색 외곽 + 아래 그늘 + 가운데 빨간 밀랍 봉인
  envSealed: [
    "........................",
    "........................",
    "........................",
    "........................",
    "........................",
    "........................",
    "oooooooooooooooooooooooo",
    "ooowwwwwwwwwwwwwwwwwwooo",
    "owwoowwwwwwwwwwwwwwoowwo",
    "owwwwoowwwwwwwwwwoowwwwo",
    "owwwwwwoowoooowoowwwwwwo",
    "owwwwwwwworrprowwwwwwwwo",
    "owwwwwwworrrrrrowwwwwwwo",
    "owwwwwwworrrrrRowwwwwwwo",
    "owwwwwwwwoRRRRowwwwwwwwo",
    "owwwwwwwwwoooowwwwwwwwwo",
    "owwwwwwwwwwwwwwwwwwwwwwo",
    "owwwwwwwwwwwwwwwwwwwwwwo",
    "owwwwwwwwwwwwwwwwwwwwwwo",
    "owwwwwwwwwwwwwwwwwwwwwwo",
    "osssssssssssssssssssssso",
    "oooooooooooooooooooooooo",
  ],
  // 읽은 봉투: 덮개가 열리고 편지지가 삐죽 나온다 (봉인 없음)
  envOpened: [
    "...........oo...........",
    ".........oolloo.........",
    "...oooooooooooooooooo...",
    "...oPPPPPPPPPPPPPPPPo...",
    "...oPPPPPPPPPPPPPPPPo...",
    ".oooPLLLLLLLLLLLLLLPooo.",
    "ooooPPPPPPPPPPPPPPPPoooo",
    "owwoPLLLLLLLLLLLLLLPowwo",
    "owwoPPPPPPPPPPPPPPPPowwo",
    "owwoPLLLLLLLLLLLLLLPowwo",
    "oowoPPPPPPPPPPPPPPPPowoo",
    "owooPLLLLLLLLLLLLLLPoowo",
    "owwwooPPPPPPPPPPPPoowwwo",
    "owwwwwooPPPPPPPPoowwwwwo",
    "owwwwwwwoooooooowwwwwwwo",
    "owwwwwwwwwoooowwwwwwwwwo",
    "owwwwwwwwwwwwwwwwwwwwwwo",
    "owwwwwwwwwwwwwwwwwwwwwwo",
    "owwwwwwwwwwwwwwwwwwwwwwo",
    "owwwwwwwwwwwwwwwwwwwwwwo",
    "osssssssssssssssssssssso",
    "oooooooooooooooooooooooo",
  ],
  // 별: 금색 (로고, 눈사람 완성, D-day)
  star: [
    ".....oo.....",
    "....oggo....",
    "....oggo....",
    "oooooggooooo",
    "oggggggggggo",
    ".oggggggggo.",
    "..oggggggo..",
    "..oggggggo..",
    ".oggggggggo.",
    ".ogggooGggo.",
    "oggoo..ooGgo",
    "ooo......ooo",
  ],
  // 호랑가시: 위에 빨간 열매 한 알, 아래로 초록 잎 두 장 (그림 아이콘: 남색 외곽선 + 아래 그늘)
  holly: [
    "....oooo....",
    "...orrwro...",
    "...orrrRo...",
    ".ooooRRoooo.",
    "onnnnoonnnno",
    "onnnnnnnnnno",
    "oNnnnoonnnNo",
    ".oNNo..oNNo.",
    "..oo....oo..",
  ],
  // 방향키 힌트: 흰 십자 패드
  arrow: [
    "....oooo....",
    "....osso....",
    "....oooo....",
    "....owwo....",
    "ooooowwooooo",
    "owowwwwwwowo",
    "ososswwssoso",
    "ooooowwooooo",
    "....osso....",
    "....oooo....",
    "....osso....",
    "....oooo....",
  ],
  // 편지지 우표 (9x10칸 = 27x30px): 흰 톱니 + berry 테두리 + 하늘색 면 + 눈사람
  stamp: [
    "w.w.w.w.w.w.w",
    ".rrrrrrrrrrr.",
    "wrcccooocccrw",
    ".rccowwwoccr.",
    "wrcowowowocrw",
    ".rcowwgwwocr.",
    "wrcorrrrrocrw",
    ".rorwwwwwror.",
    "wrowwwwwwworw",
    ".rowwosowwor.",
    "wrcooooooocrw",
    ".rrrrrrrrrrr.",
    "w.w.w.w.w.w.w",
  ],
  // 12.25 소인 고리 (21x21칸, scale 2 = 42px). 우표(26px)와 같은 도트 크기
  postmark: [
    ".........mmm.........",
    "......mmm...mmm......",
    "....mm.........mm....",
    "...mm...........mm...",
    "..mm.............mm..",
    "..m...............m..",
    ".m.................m.",
    ".m.................m.",
    ".m.................m.",
    "m...................m",
    "m...................m",
    "m...................m",
    ".m.................m.",
    ".m.................m.",
    ".m.................m.",
    "..m...............m..",
    "..mm.............mm..",
    "...mm...........mm...",
    "....mm.........mm....",
    "......mmm...mmm......",
    ".........mmm.........",
  ],
  // 작은 눈송이 (제목 장식): 흰 면 + 남색 외곽
  snowflake: [
    ".....o.....",
    "..o.owo.o..",
    ".owoowoowo.",
    "..owowowo..",
    ".ooowwwooo.",
    "owwwwwwwwwo",
    ".ooowswooo.",
    "..oswswso..",
    ".osoosooso.",
    "..o.oso.o..",
    ".....o.....",
  ],
  // 작은 집: 눈 지붕·흰 벽 + 나무 문 + 남색 외곽. 표지판 글자 옆에서는 scale 2·fit 로 쓴다
  // 첫 화면 마을 이름 앞: 빨간 지붕, 크림 벽, 불 켜진 창문과 나무 문이 있는 마을 집
  cottage: [
    ".....oo.....",
    "....orro....",
    "...orrrro...",
    "..orrrrrro..",
    ".orrrrrrrro.",
    "oooooooooooo",
    ".oPPPPPPPPo.",
    ".oPyyPPbbPo.",
    ".oPyyPPbbPo.",
    ".oPPPPPbbPo.",
    ".oooooooooo.",
  ],
  house: [
    "...oo...",
    "..owwo..",
    ".owwwwo.",
    "oooooooo",
    "owwbbwwo",
    "owwbbwwo",
    "owwbbwwo",
    "oooooooo",
  ],
  // 주인 메뉴(시안 1): 왼쪽에 스프링이 감긴 초록 수첩. 봉투(흰색)와 헷갈리지 않게 표지를 초록으로, 아래에 종이 단면
  notebook: [
    "..ooooooooo.",
    ".lonnnnnnnno",
    "o.onnnnnnnno",
    ".lonwwwwwwno",
    "o.onwsssswno",
    ".lonwwwwwwno",
    "o.onnnnnnnno",
    ".lonnnnnnnno",
    "o.onnnnnnnno",
    ".lonNNNNNNNo",
    "..oPPPPPPPPo",
    "..ooooooooo.",
  ],
  // 주인 메뉴(시안 2): 가로줄 세 개(≡). 기호 아이콘이라 속까지 남색으로 채운다
  menu: [
    "oooooooooooo",
    "oooooooooooo",
    "............",
    "............",
    "oooooooooooo",
    "oooooooooooo",
    "............",
    "............",
    "oooooooooooo",
    "oooooooooooo",
  ],
  // 숨긴 눈사람: 빗금이 그어진 눈. 눈알이 빗금에 둘로 갈리고, 빗금 양옆은 한 칸씩 비워 또렷하게 한다
  hide: [
    "...........o",
    "..........oo",
    "...ooooo.oo.",
    "..o.....oo..",
    ".o..oo.oo.o.",
    "o..oo.oo...o",
    "o..o.oo.o..o",
    ".o..oo.o..o.",
    "...oo....o..",
    "..oo.oooo...",
    ".oo.........",
    "oo..........",
  ],
  // 페이지 넘기기 화살표
  prev: [
    "....oo",
    "...ooo",
    "..oooo",
    ".ooooo",
    "oooooo",
    "oooooo",
    ".ooooo",
    "..oooo",
    "...ooo",
    "....oo",
  ],
  next: [
    "oo....",
    "ooo...",
    "oooo..",
    "ooooo.",
    "oooooo",
    "oooooo",
    "ooooo.",
    "oooo..",
    "ooo...",
    "oo....",
  ],
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

/** 같은 그림을 다른 이름으로도 부른다: 지시서의 `envelope`은 기존 `letter`와 같은 봉투다 */
const ALIASES = { envelope: "letter" } as const satisfies Record<
  string,
  keyof typeof ICONS
>;

export type PixelIconName = keyof typeof ICONS | keyof typeof ALIASES;

type Props = {
  name: PixelIconName;
  /** 도트 한 칸의 크기(px) */
  scale?: number;
  /** true면 12칸 격자에 맞추지 않고 그림 크기 그대로 쓴다 (우표처럼 칸이 정해진 장식) */
  fit?: boolean;
  className?: string;
};

/** 아이콘 칸: 모든 아이콘을 12x12 격자 가운데에 놓아 크기와 정렬을 맞춘다(더 큰 그림은 그대로) */
const GRID = 12;

export function PixelIcon({ name, scale = 3, fit = false, className }: Props) {
  const key =
    name in ALIASES
      ? ALIASES[name as keyof typeof ALIASES]
      : (name as keyof typeof ICONS);
  const rows: readonly string[] = ICONS[key];
  const glyphW = Math.max(...rows.map((r) => r.length));
  const glyphH = rows.length;
  const width = fit ? glyphW : Math.max(GRID, glyphW);
  const height = fit ? glyphH : Math.max(GRID, glyphH);
  const ox = Math.floor((width - glyphW) / 2);
  const oy = Math.floor((height - glyphH) / 2);
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
      rects.push({ x: x + ox, y: y + oy, w: end - x, color });
      x = end;
    }
  });

  return (
    <svg
      aria-hidden
      width={width * scale}
      height={height * scale}
      viewBox={`0 0 ${width} ${height}`}
      shapeRendering="crispEdges"
      className={className}
    >
      {rects.map((r, i) => (
        <rect
          key={i}
          x={r.x}
          y={r.y}
          width={r.w}
          height={1}
          style={{ fill: r.color }}
        />
      ))}
    </svg>
  );
}

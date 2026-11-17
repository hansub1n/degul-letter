// 우체통 안에 놓인 도트 봉투 (20x16 칸).
// 다른 아이콘과 같은 진한 남색 테두리 + 흰 봉투 + 빨간 밀랍 봉인.
// 읽은 편지는 봉인이 뜯기고 덮개가 위로 젖혀져 안쪽이 보인다.

const PALETTE: Record<string, string> = {
  o: "#2A2350", // 테두리
  w: "#FFFFFF", // 봉투
  s: "#DCE5F2", // 봉투 안쪽·아래 그늘
  r: "#E0574F", // 봉인
  R: "#B23A34",
  p: "#FF8F87",
};

const SEALED = [
  "....................",
  "....................",
  "....................",
  "....................",
  "....................",
  "oooooooooooooooooooo",
  "ooowwwwwwwwwwwwwwooo",
  "owwoowwwwwwwwwwoowwo",
  "owwwwoowwwwwwoowwwwo",
  "owwwwwwoorroowwwwwwo",
  "owwwwwwwrprrwwwwwwwo",
  "owwwwwwwrrrRwwwwwwwo",
  "owwwwwwwwRRwwwwwwwwo",
  "owwwwwwwwwwwwwwwwwwo",
  "osssssssssssssssssso",
  "oooooooooooooooooooo",
];

const OPENED = [
  ".........oo.........",
  ".......oossoo.......",
  ".....oossssssoo.....",
  "...oossssssssssoo...",
  ".oossssssssssssssoo.",
  "oooooooooooooooooooo",
  "ooossssssssssssssooo",
  "owwoossssssssssoowwo",
  "owwwwoossssssoowwwwo",
  "owwwwwwoossoowwwwwwo",
  "owwwwwwwwoowwwwwwwwo",
  "owwwwwwwwwwwwwwwwwwo",
  "owwwwwwwwwwwwwwwwwwo",
  "owwwwwwwwwwwwwwwwwwo",
  "osssssssssssssssssso",
  "oooooooooooooooooooo",
];

type Rect = { x: number; y: number; w: number; c: string };

/** 같은 색이 가로로 이어지면 사각형 하나로 합친다 */
function toRects(rows: readonly string[]): Rect[] {
  const rects: Rect[] = [];
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const c = PALETTE[row[x]];
      if (!c) {
        x++;
        continue;
      }
      let end = x + 1;
      while (end < row.length && row[end] === row[x]) end++;
      rects.push({ x, y, w: end - x, c });
      x = end;
    }
  });
  return rects;
}

export function EnvelopeArt({ opened = false, scale = 3 }: { opened?: boolean; scale?: number }) {
  return (
    <svg aria-hidden width={20 * scale} height={16 * scale} viewBox="0 0 20 16" shapeRendering="crispEdges">
      {toRects(opened ? OPENED : SEALED).map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height={1} fill={r.c} />
      ))}
    </svg>
  );
}

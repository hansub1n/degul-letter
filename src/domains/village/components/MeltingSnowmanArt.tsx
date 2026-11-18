// 녹아 버리는 눈사람 (16x12 칸). "편지 없이 나가면 녹아요" 확인 화면에 쓴다.
// 머리가 몸 쪽으로 처지고, 아래로 물웅덩이가 번진다. 색은 globals.css 팔레트 그대로.

const PALETTE: Record<string, string> = {
  e: "#A9B8D6", // --snow-edge: 눈 외곽
  w: "#FFFFFF", // --snow
  s: "#DCE5F2", // --snow-shade: 눈 그늘
  k: "#2A2350", // --ink: 눈
  d: "#C9D3E6", // --path: 녹은 물웅덩이
  D: "#B8C4DC", // --path-deep: 웅덩이 그늘
};

const ROWS = [
  "......eeee......",
  ".....ewwwwe.....",
  ".....ewkwke.....",
  ".....ewwwse.....",
  "....eewssee.....",
  "...ewwwwwwsse...",
  "..ewwwwwwwssse..",
  "..ewwwwwwsssse..",
  ".eewwwwsssssseed",
  "deeeeeeeeeeeeedd",
  ".dddDDDDDDDdddd.",
  "...ddd....dd....",
];

type Rect = { x: number; y: number; w: number; c: string };

/** 같은 색이 가로로 이어지면 사각형 하나로 합친다 (EnvelopeArt와 같은 방식) */
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
      let w = 1;
      while (x + w < row.length && row[x + w] === row[x]) w++;
      rects.push({ x, y, w, c });
      x += w;
    }
  });
  return rects;
}

const RECTS = toRects(ROWS);
const W = ROWS[0].length;
const H = ROWS.length;

export function MeltingSnowmanArt({ scale = 5, className = "" }: { scale?: number; className?: string }) {
  return (
    <svg
      aria-hidden
      width={W * scale}
      height={H * scale}
      viewBox={`0 0 ${W} ${H}`}
      shapeRendering="crispEdges"
      className={className}
    >
      {RECTS.map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height={1} fill={r.c} />
      ))}
    </svg>
  );
}

// 집 모양 머리의 금색 열쇠 (16x16 칸). 로그인 모달 "내 마을을 지켜 줄 열쇠" 장식.
// 색은 globals.css 팔레트 변수만 쓴다.

const PALETTE: Record<string, string> = {
  o: "var(--ink)",
  g: "var(--gold)",
  G: "var(--gold-shade)",
  w: "var(--snow)",
  y: "var(--window)",
};

const ROWS = [
  "......oooo......",
  ".....oggggo.....",
  "....oggggggo....",
  "...oooooooooo...",
  "...ogwwywwggo...",
  "...ogwwwwwwGo...",
  "...oooooooooo...",
  "......ogoG......",
  "......ogoG......",
  "......ogoG......",
  "......ogoG......",
  "......ogoooo....",
  "......ogo.......",
  "......ogoooo....",
  "......ogo.......",
  "......ooo.......",
];

type Rect = { x: number; y: number; w: number; c: string };

/** 같은 색이 가로로 이어지면 사각형 하나로 합친다 (MeltingSnowmanArt와 같은 방식) */
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

export function LoginKeyArt({ scale = 5, className = "" }: { scale?: number; className?: string }) {
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

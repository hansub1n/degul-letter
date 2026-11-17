// 우체통 안에 놓인 도트 봉투 (20x15 칸).
// 크림색 봉투 + 부드러운 갈색 테두리 + V자 덮개 + 둥근 빨간 밀랍 봉인.
// 읽은 편지는 봉인이 뜯기고 줄 그어진 편지지가 위로 빠져나온다.

const C = {
  line: "#C9B88F",
  cream: "#F7EFD9",
  shade: "#EBDFC1",
  flap: "#DCCCA6",
  seal: "#C8423A",
  sealDark: "#9E2F29",
  sealLight: "#E8746B",
  paper: "#FFFFFF",
  rule: "#DCE2EE",
};

type Rect = { x: number; y: number; w: number; h: number; c: string };

function envelopeRects(opened: boolean): Rect[] {
  const r: Rect[] = [];
  const top = opened ? 6 : 2;
  if (opened) {
    r.push({ x: 3, y: 0, w: 14, h: 9, c: C.line });
    r.push({ x: 4, y: 1, w: 12, h: 8, c: C.paper });
    r.push({ x: 6, y: 3, w: 8, h: 1, c: C.rule });
    r.push({ x: 6, y: 5, w: 6, h: 1, c: C.rule });
  }
  // 몸통
  r.push({ x: 0, y: top, w: 20, h: 15 - top, c: C.line });
  r.push({ x: 1, y: top + 1, w: 18, h: 13 - top, c: C.cream });
  r.push({ x: 1, y: 13, w: 18, h: 1, c: C.shade });
  // V자 덮개
  const depth = opened ? 4 : 6;
  for (let i = 0; i < 9; i++) {
    const y = top + 1 + Math.round((i / 8) * depth);
    r.push({ x: 1 + i, y, w: 1, h: 1, c: C.flap });
    r.push({ x: 18 - i, y, w: 1, h: 1, c: C.flap });
  }
  if (!opened) {
    // 둥근 밀랍 봉인 (반짝이는 점 하나)
    r.push({ x: 9, y: 6, w: 2, h: 1, c: C.seal });
    r.push({ x: 8, y: 7, w: 4, h: 2, c: C.seal });
    r.push({ x: 9, y: 9, w: 2, h: 1, c: C.sealDark });
    r.push({ x: 8, y: 9, w: 1, h: 1, c: C.sealDark });
    r.push({ x: 11, y: 9, w: 1, h: 1, c: C.sealDark });
    r.push({ x: 9, y: 7, w: 1, h: 1, c: C.sealLight });
  }
  return r;
}

export function EnvelopeArt({ opened = false, scale = 3 }: { opened?: boolean; scale?: number }) {
  return (
    <svg aria-hidden width={20 * scale} height={15 * scale} viewBox="0 0 20 15" shapeRendering="crispEdges">
      {envelopeRects(opened).map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} fill={r.c} />
      ))}
    </svg>
  );
}

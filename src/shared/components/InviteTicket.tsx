"use client";

import type { ButtonHTMLAttributes } from "react";

// 친구 마을에 들어온 사람에게 보여 주는 "내 마을 만들기" 초대장 티켓 (46x15 칸, 1칸 = --p).
// 왼쪽: 항공우편 줄무늬 + 크림색 종이 / 가운데: 점선 절취선과 위아래 둥근 홈 / 오른쪽: 빨간 손잡이에 집 아이콘.
// 색은 globals.css 팔레트 그대로 쓴다.

const COLOR: Record<string, string> = {
  o: "var(--ink)", // 외곽선, 절취선, 줄무늬 남색
  c: "var(--paper)", // 종이
  h: "var(--snow)", // 종이 윗줄 (밝게)
  d: "var(--wall-shade)", // 종이 아랫줄 (그늘)
  r: "var(--roof)", // 손잡이, 줄무늬 빨강
  R: "var(--roof-shade)", // 손잡이 아랫줄
  L: "#D9605A", // 손잡이 윗줄 (roof보다 한 단계 밝게)
  s: "var(--night)", // 바닥 그림자
  w: "var(--paper)", // 집 아이콘 벽
  y: "var(--window)", // 집 창문
};

const W = 46;
const H = 15;
const STUB = 10;
const PERF = W - STUB - 1; // 절취선 x
const NOTCH_R2 = 4.5; // 홈 반지름^2

function inside(x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= W || y >= H) return false;
  // 네 모서리 한 칸씩 깎기
  if ((x === 0 || x === W - 1) && (y === 0 || y === H - 1)) return false;
  // 절취선 위아래 둥근 홈
  for (const ny of [-0.5, H - 0.5]) {
    const dx = x - PERF;
    const dy = y - ny;
    if (dx * dx + dy * dy <= NOTCH_R2) return false;
  }
  return true;
}

function cellColor(x: number, y: number): string {
  const edge = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
  if (edge) return "o";
  if (x === PERF) return y % 2 === 0 ? "o" : "c";
  if (x > PERF) return y === 1 ? "L" : y === H - 2 ? "R" : "r";
  // 왼쪽 끝 3칸: 항공우편 사선 줄무늬 (빨강 3 · 크림 1 · 남색 1 · 크림 1)
  if (x >= 1 && x <= 3) {
    const k = (x + y) % 6;
    return k < 3 ? "r" : k === 4 ? "o" : "c";
  }
  return y === 1 ? "h" : y === H - 2 ? "d" : "c";
}

type Rect = { x: number; y: number; w: number; c: string };

/** 같은 색이 가로로 이어지면 사각형 하나로 합친다 */
function buildRects(): { body: Rect[]; shadow: Rect[] } {
  const body: Rect[] = [];
  const shadow: Rect[] = [];
  for (let y = 0; y < H; y++) {
    let x = 0;
    while (x < W) {
      if (!inside(x, y)) {
        x++;
        continue;
      }
      const c = cellColor(x, y);
      let end = x + 1;
      while (end < W && inside(end, y) && cellColor(end, y) === c) end++;
      body.push({ x, y, w: end - x, c });
      x = end;
    }
    // 그림자: 같은 모양을 2칸 아래에
    let sx = 0;
    while (sx < W) {
      if (!inside(sx, y)) {
        sx++;
        continue;
      }
      let end = sx + 1;
      while (end < W && inside(end, y)) end++;
      shadow.push({ x: sx, y: y + 2, w: end - sx, c: "s" });
      sx = end;
    }
  }
  return { body, shadow };
}

const { body: BODY, shadow: SHADOW } = buildRects();

// 손잡이 안쪽 폭이 9칸이라 집은 7x7로 그린다 (다른 도트와 같은 --p 격자에 맞춘다)
const HOUSE = [
  "...w...",
  "..www..",
  ".wwwww.",
  "wwwwwww",
  ".wywRw.",
  ".wwwRw.",
  ".wwwRw.",
];

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children">;

/**
 * 오른쪽 위 "내 마을 만들기" 초대장. 버튼처럼 hover 때 한 칸 들리고, 누르면 제자리로 내려간다.
 * 이미 마을이 있는 사람에게는 보여 주지 않는다 (그때는 "내 마을 가기" 버튼).
 */
export function InviteTicket({ className = "", type = "button", ...rest }: Props) {
  return (
    <button
      type={type}
      aria-label="초대장: 내 마을 만들기"
      className={`group relative inline-block shrink-0 select-none transition-transform duration-[80ms] [transition-timing-function:steps(2,end)] hover:-translate-y-[var(--p)] active:translate-y-[var(--p)] focus-visible:outline-[length:var(--p)] focus-visible:outline-offset-[var(--p)] focus-visible:outline-gold ${className}`}
      style={{ width: `calc(var(--p) * ${W})`, height: `calc(var(--p) * ${H + 2})` }}
      {...rest}
    >
      <svg
        aria-hidden
        className="absolute inset-0 block h-full w-full"
        viewBox={`0 0 ${W} ${H + 2}`}
        shapeRendering="crispEdges"
      >
        {/* 누르는 동안에는 그림자를 숨긴다 */}
        <g className="group-active:hidden">
          {SHADOW.map((r, i) => (
            <rect key={`s${i}`} x={r.x} y={r.y} width={r.w} height={1} fill={COLOR[r.c]} />
          ))}
        </g>
        {BODY.map((r, i) => (
          <rect key={i} x={r.x} y={r.y} width={r.w} height={1} fill={COLOR[r.c]} />
        ))}
        {/* 손잡이 가운데 집 아이콘 */}
        <g transform={`translate(${PERF + 1 + Math.floor((STUB - 1 - HOUSE[0].length) / 2)} ${Math.floor((H - HOUSE.length) / 2)})`}>
          {HOUSE.flatMap((row, y) =>
            [...row].map((ch, x) =>
              ch === "." ? null : (
                <rect key={`h${x}-${y}`} x={x} y={y} width={1} height={1} fill={COLOR[ch]} />
              ),
            ),
          )}
        </g>
      </svg>
      <span
        className="absolute flex flex-col justify-center gap-px text-left"
        style={{ left: "calc(var(--p) * 6)", top: 0, height: `calc(var(--p) * ${H})` }}
      >
        <span className="text-label leading-[1.15] text-roof">초대장</span>
        <span className="text-label whitespace-nowrap leading-[1.15] text-ink">내 마을 만들기</span>
      </span>
    </button>
  );
}

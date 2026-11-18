"use client";

import { STAMP_PALETTE, STAMPS, stampFor } from "../lib/stamps";

const SIZE = 25;
const SCALE = 2;
/** 쓰기 칸처럼 아직 letterId가 없을 때. stampFor가 항상 같은 우표(소나무)를 고른다. */
export const DRAFT_STAMP_ID = "draft";

type ArtRect = { x: number; y: number; w: number; c: string };
type ShadowRect = { x: number; y: number; w: number };

/** 같은 색이 가로로 이어지면 사각형 하나로 합친다. "." 는 투명한 톱니 구멍. */
function toRects(rows: readonly string[]): ArtRect[] {
  const rects: ArtRect[] = [];
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      const c = ch === "." ? undefined : STAMP_PALETTE[ch];
      if (!c) {
        x++;
        continue;
      }
      let end = x + 1;
      while (end < row.length && row[end] === ch) end++;
      rects.push({ x, y, w: end - x, c });
      x = end;
    }
  });
  return rects;
}

/** 구멍까지 포함한 실루엣. 그림자 색은 한 가지라 이어진 칸을 합친다. */
function toShadowRects(rows: readonly string[]): ShadowRect[] {
  const rects: ShadowRect[] = [];
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      if (row[x] === "." || !STAMP_PALETTE[row[x]]) {
        x++;
        continue;
      }
      let end = x + 1;
      while (end < row.length && row[end] !== "." && STAMP_PALETTE[row[end]]) end++;
      rects.push({ x, y, w: end - x });
      x = end;
    }
  });
  return rects;
}

type Props = {
  /** 같은 편지는 기기와 상관 없이 항상 같은 우표. 없으면 쓰기 칸용 고정 fallback */
  letterId?: string;
  className?: string;
};

/**
 * 편지지 오른쪽 위 우표. 25×25 도트를 scale 2로 그려 50×50px.
 * 아래에 1도트(2px) 오른쪽·아래로 밀린 --wall-shade 그림자를 두고,
 * 왼쪽 아래 모서리에 12.25 소인 고리를 반쯤 걸친다.
 */
export function LetterStamp({ letterId, className = "" }: Props) {
  const rows = STAMPS[stampFor(letterId ?? DRAFT_STAMP_ID)];
  const art = toRects(rows);
  const shadow = toShadowRects(rows);
  const css = SIZE * SCALE;

  return (
    <span className={`letter-stamp pointer-events-none inline-block ${className}`} aria-hidden>
      <svg
        width={css}
        height={css}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        shapeRendering="crispEdges"
        overflow="visible"
      >
        <g transform="translate(1, 1)">
          {shadow.map((r, i) => (
            <rect key={`s${i}`} x={r.x} y={r.y} width={r.w} height={1} fill="var(--wall-shade)" />
          ))}
        </g>
        {art.map((r, i) => (
          <rect key={i} x={r.x} y={r.y} width={r.w} height={1} fill={r.c} />
        ))}
      </svg>
      <span className="letter-postmark">
        <span className="letter-postmark-date">12.25</span>
      </span>
    </span>
  );
}

"use client";

import type { ReactNode } from "react";
import { PixelButton } from "@/shared/components/PixelButton";

/** 카카오: 말풍선. 공식 로고가 아니라 간단한 도트 표식만 쓴다. */
const BUBBLE = [
  ".ooooooo.",
  "owwwwwwwo",
  "owwwwwwwo",
  "owwwwwwwo",
  "owwwwwwwo",
  ".oooooooo",
  "...oo....",
  "..oo.....",
] as const;

/** Google: 작은 지구본. 네 색 G 마크처럼 공식 로고를 흉내 내지 않는다. */
const GLOBE = [
  "..oooo..",
  ".owwwwo.",
  "owwowwwo",
  "owoooowo",
  "owwowwwo",
  ".owwwwo.",
  "..oooo..",
] as const;

function PixelMark({
  rows,
  onPrimary = false,
  scale = 2,
}: {
  rows: readonly string[];
  onPrimary?: boolean;
  scale?: number;
}) {
  // 빨간 주요 단추 위에서는 표식 전체를 흰 눈색으로, 흰 단추 위에서는 남색 외곽 + 흰 면으로 그린다
  const line = onPrimary ? "var(--snow)" : "var(--ink)";
  const fill = onPrimary ? "var(--snow)" : "var(--paper)";
  const width = Math.max(...rows.map((row) => row.length));
  const height = rows.length;
  const rects: Array<{ x: number; y: number; w: number; fill: string }> = [];
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      if (ch === ".") {
        x++;
        continue;
      }
      const color = ch === "w" ? fill : line;
      let end = x + 1;
      while (end < row.length && row[end] === ch) end++;
      rects.push({ x, y, w: end - x, fill: color });
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
      className="shrink-0"
    >
      {rects.map((rect, i) => (
        <rect key={i} x={rect.x} y={rect.y} width={rect.w} height={1} fill={rect.fill} />
      ))}
    </svg>
  );
}

function Label({ mark, children }: { mark: ReactNode; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-[calc(var(--p)*2)]">
      {mark}
      {children}
    </span>
  );
}

type Props = {
  onKakao: () => void;
  /** 없으면 Google 단추를 숨긴다 */
  onGoogle?: () => void;
  /** 로그인 페이지로 넘어가는 중이면 단추를 잠근다 */
  busy?: boolean;
};

/** 로그인 수단 단추. 카카오가 주요 단추, Google은 보조 단추. */
export function LoginMethods({ onKakao, onGoogle, busy = false }: Props) {
  return (
    <div className="flex w-full flex-col gap-[calc(var(--p)*4)]">
      <PixelButton variant="primary" className="w-full" disabled={busy} onClick={onKakao} aria-label="카카오로 계속하기">
        <Label mark={<PixelMark rows={BUBBLE} onPrimary />}>카카오로 계속하기</Label>
      </PixelButton>
      {onGoogle && (
        <PixelButton variant="secondary" className="w-full" disabled={busy} onClick={onGoogle} aria-label="Google로 계속하기">
          <Label mark={<PixelMark rows={GLOBE} />}>Google로 계속하기</Label>
        </PixelButton>
      )}
    </div>
  );
}

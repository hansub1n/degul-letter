"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { PixelButton } from "@/shared/components/PixelButton";
import kakaoLogin from "../assets/kakao_login_kr_large.svg";

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

/** 로그인 수단 단추. 카카오는 카카오 디자인 가이드 그대로, Google은 보조 단추. */
export function LoginMethods({ onKakao, onGoogle, busy = false }: Props) {
  return (
    <div className="flex w-full flex-col gap-[calc(var(--p)*4)]">
      <KakaoLoginButton disabled={busy} onClick={onKakao} />
      {onGoogle && (
        <PixelButton variant="secondary" className="w-full" disabled={busy} onClick={onGoogle} aria-label="Google로 계속하기">
          <Label mark={<PixelMark rows={GLOBE} />}>Google로 계속하기</Label>
        </PixelButton>
      )}
    </div>
  );
}

/**
 * 카카오 로그인 버튼: 카카오가 제공하는 표준 버튼 그림을 그대로 쓴다 (가이드는 표준 디자인 사용을 권장한다).
 * 그림은 카카오 개발자 사이트 [도구 > 리소스 다운로드 > 카카오 로그인]의 Kakao Login.zip 안 SVG/kakao_login_kr_large.svg.
 * 가로세로 비율을 지킨 채 카드 폭에 맞춰 늘리고 줄이기만 한다 (색·모양·글자는 손대지 않는다).
 */
function KakaoLoginButton({ disabled, onClick }: { disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label="카카오 로그인"
      className="block w-full transition-opacity disabled:opacity-60"
    >
      <Image src={kakaoLogin} alt="" unoptimized priority className="h-auto w-full" />
    </button>
  );
}

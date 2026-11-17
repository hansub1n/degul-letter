import type { ElementType, HTMLAttributes, ReactNode } from "react";

export type PixelTone = "snow" | "night" | "wood" | "paper";

type Props = HTMLAttributes<HTMLElement> & {
  /** 재질: snow(카드, 다이얼로그) · wood(마을 이름 표지판) · paper(편지지) · night(밤 모드 토스트만) */
  tone?: PixelTone;
  /** 그릴 태그 (div, section, article, li ...) */
  as?: ElementType;
  /** 안쪽 여백. 도트 한 칸(--p, 3px)의 배수로 센다. 기본 4칸 = 12px */
  pad?: number;
  /** 입력칸처럼 바깥 그림자가 없는 상자 */
  flat?: boolean;
  children?: ReactNode;
};

/** 같은 계단 테두리와 불투명 1칸 그림자를 쓰는 도트 상자. 모든 상자는 이걸 쓴다. */
export function PixelPanel({ tone = "snow", as: Tag = "div", pad = 4, flat = false, className = "", style, ...rest }: Props) {
  return (
    <Tag
      data-tone={tone}
      className={`pixel-box ${flat ? "pixel-box-flat" : ""} ${className}`}
      style={{ padding: `calc(var(--p) * ${pad})`, ...style }}
      {...rest}
    />
  );
}

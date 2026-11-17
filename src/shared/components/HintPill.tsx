import type { HTMLAttributes } from "react";

/** 화면 위에 떠 있는 도트 안내 상자. 마을 화면과 조각 화면이 함께 쓴다. */
export function HintPill({ className = "", ...rest }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={`pixel-box pixel-box-flat pointer-events-none px-3 py-2 text-center text-[12px] leading-[1.5] text-ink ${className}`}
      {...rest}
    />
  );
}

import type { HTMLAttributes } from "react";
import { PixelIcon, type PixelIconName } from "./PixelIcon";

type Props = HTMLAttributes<HTMLSpanElement> & {
  /** gold = D-day, berry = 개수(흰 글자), ribbon = 표지판 아래 빨간 리본 */
  tone?: "gold" | "berry" | "ribbon";
  icon?: PixelIconName;
};

/** 작은 도트 배지. 그림자 없이 테두리와 아랫줄 그늘만 있다. */
export function PixelBadge({ tone = "gold", icon, className = "", children, ...rest }: Props) {
  const look = tone === "ribbon" ? "pixel-ribbon px-[calc(var(--p)*6)] py-[var(--p)]" : "pixel-box pixel-badge px-[calc(var(--p)*2)] py-0";
  return (
    <span
      data-tone={tone}
      className={`${look} text-label inline-flex items-center gap-[var(--p)] whitespace-nowrap ${className}`}
      {...rest}
    >
      {icon && <PixelIcon name={icon} scale={1} className="shrink-0" />}
      {children}
    </span>
  );
}

import type { HTMLAttributes } from "react";
import { PixelIcon, type PixelIconName } from "./PixelIcon";

type Props = HTMLAttributes<HTMLSpanElement> & {
  /** 글자 앞 12px 그림 아이콘 (예: D-day의 호랑가시) */
  icon?: PixelIconName;
};

/**
 * 작은 도트 꼬리표. 모든 배지(D-day, 개수)는 이 한 가지 모양만 쓴다:
 * 흰 편지지 면 + 남색 글자 + 남색 테두리 + 1칸 남색 그림자.
 * 갈무리체는 글자마다 오른쪽에 1px 여백이 붙어 있어서, 오른쪽 안쪽 여백을 1px 줄여 글자가 가운데 오게 한다.
 */
export function PixelBadge({ icon, className = "", children, ...rest }: Props) {
  return (
    <span
      className={`pixel-box pixel-badge text-label inline-flex items-center gap-[var(--p)] whitespace-nowrap pl-[calc(var(--p)*2)] pr-[calc(var(--p)*2-1px)] py-0 ${className}`}
      {...rest}
    >
      {icon && <PixelIcon name={icon} scale={1} className="shrink-0" />}
      {children}
    </span>
  );
}

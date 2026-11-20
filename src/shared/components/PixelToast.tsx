import type { HTMLAttributes } from "react";
import { PixelIcon, type PixelIconName } from "./PixelIcon";

type Props = HTMLAttributes<HTMLParagraphElement> & {
  /** 글자 앞 12px 아이콘 */
  icon?: PixelIconName;
  /**
   * fixed(기본): 화면 아래 가운데, 안전 영역 위에 뜬다.
   * inline: 놓인 자리에 그대로 둔다(조각 화면 위쪽 안내, 로딩 문구처럼 흐름 안에 둘 때).
   */
  placement?: "fixed" | "inline";
  /** fixed일 때 기본 자리(바닥에서 24px)보다 몇 px 더 올릴지. 아래 링크나 다른 알림과 겹치지 않게 할 때 */
  lift?: number;
};

/**
 * 화면 위의 짧은 안내. HintPill을 대체한다.
 * 낮에는 snow 재질(남색 글자), 밤 모드(`data-time="night"`)에서는 night 재질이다.
 * 2칸 아래에서 steps(3) 150ms로 올라온다.
 */
export function PixelToast({ icon, placement = "fixed", lift = 0, className = "", style, children, ...rest }: Props) {
  const where =
    placement === "fixed" ? "fixed left-1/2 z-40 w-max -translate-x-1/2 max-w-[calc(100vw-24px)]" : "relative flex min-w-0 justify-center";
  return (
    <div
      className={where}
      style={placement === "fixed" ? { bottom: `calc(env(safe-area-inset-bottom) + ${24 + lift}px)` } : undefined}
    >
      <p
        role="status"
        aria-live="polite"
        className={`pixel-box pixel-toast pixel-rise text-body pointer-events-none flex items-center justify-center gap-[calc(var(--p)*2)] px-[calc(var(--p)*4)] py-[calc(var(--p)*2)] text-center ${className}`}
        style={style}
        {...rest}
      >
        {icon && <PixelIcon name={icon} scale={1} className="shrink-0" />}
        <span>{children}</span>
      </p>
    </div>
  );
}

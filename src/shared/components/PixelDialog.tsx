"use client";

import { useEffect, useId, useLayoutEffect, useRef, type ReactNode } from "react";
import { acquireModalLock } from "@/shared/lib/modalLock";
import { PixelBadge } from "./PixelBadge";
import { PixelButton } from "./PixelButton";
import { PixelIcon, type PixelIconName } from "./PixelIcon";

type Props = {
  title: ReactNode;
  /** 제목 앞 아이콘 */
  icon?: PixelIconName;
  /** 제목 옆 배지 (예: 편지 개수). 문자열이면 berry 배지로 그린다 */
  badge?: ReactNode;
  /** 헤더 정렬: center(기본, 시안 04 눈사람 완성) · start(시안 03 우체통처럼 왼쪽) */
  align?: "center" | "start";
  /** 제목 아래 한 줄 caption */
  caption?: ReactNode;
  /** 닫기 버튼, Esc, 베일 클릭이 모두 이걸 부른다 (취소: 저장하지 않는다) */
  onClose: () => void;
  /** 베일(바깥)을 눌러도 닫을지. 기본 true */
  closeOnVeil?: boolean;
  /** 맨 아래 버튼 줄 */
  footer?: ReactNode;
  /** 처음 초점을 줄 요소 (없으면 본문의 첫 입력칸 → 첫 버튼 순) */
  initialFocusRef?: React.RefObject<HTMLElement | null>;
  /** 창 전체를 덮는 확인 상자 등. 있으면 본문·푸터는 inert가 된다 */
  cover?: ReactNode;
  /** 긴 제목을 한 줄로 자르지 않고 줄바꿈한다 */
  wrapTitle?: boolean;
  /** 닫기(X) 단추를 숨긴다. Esc·베일 클릭은 그대로 onClose를 부른다 */
  hideClose?: boolean;
  /** 제목·닫기 헤더를 숨긴다. 접근성용 이름은 title로 남긴다 */
  hideHeader?: boolean;
  /** 창의 최소 높이(px). 내용이 바뀌어도 크기가 줄지 않게 할 때 쓴다 */
  minHeight?: number;
  className?: string;
  children?: ReactNode;
};

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * 모든 모달이 함께 쓰는 도트 창.
 * 뒤는 가벼운 흰 베일(--veil), 창은 snow 재질이다.
 * role="dialog" + aria-modal + aria-labelledby, 포커스 트랩, Esc 닫기, 이전 포커스 복구, 배경 스크롤 잠금을 직접 구현했다.
 */
export function PixelDialog({
  title,
  icon,
  badge,
  caption,
  align = "center",
  onClose,
  closeOnVeil = true,
  footer,
  initialFocusRef,
  cover,
  wrapTitle = false,
  hideClose = false,
  hideHeader = false,
  minHeight,
  className = "",
  children,
}: Props) {
  const centered = align === "center";
  const titleId = useId();
  const captionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // 열린 동안 뒤 마을 조작·페이지 스크롤을 잠근다. 창이 바뀌어도 카운트로 유지된다
  useLayoutEffect(() => acquireModalLock(), []);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const previous = document.activeElement as HTMLElement | null;

    // 처음 초점: 지정한 요소 → 본문 첫 입력칸 → 닫기가 아닌 첫 버튼 → 창 자체
    const body = panel.querySelector<HTMLElement>("[data-dialog-body]");
    const first =
      initialFocusRef?.current ??
      body?.querySelector<HTMLElement>("input, textarea, select") ??
      panel.querySelector<HTMLElement>(
        FOCUSABLE.split(", ")
          .flatMap((sel) => [`[data-dialog-body] ${sel}`, `[data-dialog-footer] ${sel}`])
          .join(", "),
      ) ??
      panel;
    first.focus({ preventScroll: true });

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) =>
          (el.offsetParent !== null || el === document.activeElement) && !el.closest("[inert]"),
      );
      if (items.length === 0) {
        e.preventDefault();
        panel.focus();
        return;
      }
      const head = items[0];
      const tail = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === head || !panel.contains(active))) {
        e.preventDefault();
        tail.focus();
      } else if (!e.shiftKey && (active === tail || !panel.contains(active))) {
        e.preventDefault();
        head.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown, true);

    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      // 이전 포커스 복구
      if (previous && document.contains(previous)) previous.focus({ preventScroll: true });
    };
  }, [initialFocusRef]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-veil"
      style={{
        paddingTop: "max(calc(var(--p) * 4), env(safe-area-inset-top, 0px))",
        paddingRight: "max(calc(var(--p) * 4), env(safe-area-inset-right, 0px))",
        paddingBottom: "max(calc(var(--p) * 4), env(safe-area-inset-bottom, 0px))",
        paddingLeft: "max(calc(var(--p) * 4), env(safe-area-inset-left, 0px))",
      }}
      onPointerDown={(e) => {
        if (closeOnVeil && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={hideHeader ? undefined : titleId}
        aria-label={hideHeader && typeof title === "string" ? title : undefined}
        aria-describedby={caption ? captionId : undefined}
        tabIndex={-1}
        data-tone="snow"
        className={`pixel-box pixel-rise relative flex max-h-[calc(100dvh-36px-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px))] w-full max-w-[360px] flex-col gap-[calc(var(--p)*4)] text-ink outline-none ${className}`}
        style={{ padding: "calc(var(--p) * 5)", minHeight: minHeight ? `${minHeight}px` : undefined }}
      >
        <div data-dialog-chrome inert={cover ? true : undefined} className="flex min-h-0 flex-1 flex-col gap-[calc(var(--p)*4)]">
          {!hideHeader && (
          <div className="flex flex-col gap-[var(--p)]">
          {/* 헤더: 가운데 정렬이면 왼쪽에 닫기 버튼만큼 빈 칸을 둬서 제목이 창 한가운데에 온다 */}
          <div className={centered ? "grid grid-cols-[36px_minmax(0,1fr)_36px] items-center gap-[calc(var(--p)*2)]" : "flex items-center gap-[calc(var(--p)*2)]"}>
            {centered && <span aria-hidden />}
            <div className={`flex min-w-0 items-center gap-[calc(var(--p)*2)] ${centered ? "justify-center" : ""}`}>
              {icon && !centered && <PixelIcon name={icon} scale={2} className="shrink-0" />}
              <h2 id={titleId} className={`text-title min-w-0 ${wrapTitle ? "text-center whitespace-normal" : "truncate"}`}>
                {title}
              </h2>
              {/* 가운데 정렬(시안 04)에서는 아이콘이 제목 오른쪽에 온다 */}
              {icon && centered && <PixelIcon name={icon} scale={2} className="shrink-0" />}
              {badge != null &&
                (typeof badge === "string" || typeof badge === "number" ? (
                  <PixelBadge>{badge}</PixelBadge>
                ) : (
                  badge
                ))}
            </div>
            {hideClose ? (
              <span aria-hidden className={centered ? "justify-self-end w-9" : "ml-auto w-9"} />
            ) : (
            <PixelButton
              iconOnly
              size="sm"
              icon="close"
              aria-label="닫기"
              className={centered ? "justify-self-end" : "ml-auto"}
              onClick={onClose}
            />
            )}
          </div>
          {caption && (
            <p id={captionId} className={`text-caption ${centered ? "text-center" : ""}`}>
              {caption}
            </p>
          )}
        </div>
          )}
        {/* 안쪽 상자의 테두리와 금색 링(3칸)이 잘리지 않게 여백을 두고 같은 만큼 당긴다 */}
        <div
          data-dialog-body
          className="flex min-h-0 flex-1 flex-col overflow-y-auto"
          style={{ margin: "calc(var(--p) * -3)", padding: "calc(var(--p) * 3)" }}
        >
          {children}
        </div>
        {footer && (
          <div data-dialog-footer className="flex gap-[calc(var(--p)*4)]">
            {footer}
          </div>
        )}
        </div>
        {cover}
      </div>
    </div>
  );
}

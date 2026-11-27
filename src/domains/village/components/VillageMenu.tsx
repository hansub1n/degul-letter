"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { PixelBadge } from "@/shared/components/PixelBadge";
import { PixelButton } from "@/shared/components/PixelButton";
import { PixelIcon, type PixelIconName } from "@/shared/components/PixelIcon";

export type VillageMenuItem = {
  icon: PixelIconName;
  label: string;
  /** 글자 오른쪽 개수 배지 (숨긴 눈사람 수). 0이면 붙이지 않는다 */
  count?: number;
  /** 로그아웃처럼 나가는 항목: 빨간 글자, 위에 점선을 두고 맨 아래에 둔다 */
  danger?: boolean;
  onSelect: () => void;
};

type Props = {
  items: readonly VillageMenuItem[];
  /** 수첩 옆에 둘 버튼 (공유하기, 내 마을 가기 등). 메뉴판은 이 묶음의 오른쪽 끝에 맞춘다 */
  children?: ReactNode;
};

/**
 * 마을 오른쪽 위 수첩 메뉴. 주인과 로그인한 방문자가 같이 쓴다 (항목은 화면 쪽이 정한다).
 * 아이콘 + 글자 항목, 나가는 항목(로그아웃)은 점선 아래 빨간 글자.
 */
export function VillageMenu({ items, children }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!rootRef.current?.contains(target)) setOpen(false);
      else if (!buttonRef.current?.contains(target) && !menuRef.current?.contains(target)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const normal = items.filter((item) => !item.danger);
  const danger = items.filter((item) => item.danger);

  const row = (item: VillageMenuItem) => (
    <button
      key={item.label}
      type="button"
      role="menuitem"
      className={`menu-item text-label flex items-center gap-[calc(var(--p)*3)] ${item.danger ? "menu-item-danger" : ""}`}
      onClick={() => {
        setOpen(false);
        item.onSelect();
      }}
    >
      <PixelIcon name={item.icon} scale={2} className="shrink-0" />
      <span className="flex-1">{item.label}</span>
      {item.count ? <PixelBadge aria-label={`${item.count}개`}>{item.count}</PixelBadge> : null}
    </button>
  );

  return (
    <div ref={rootRef} className="relative flex items-start gap-[calc(var(--p)*4)]">
      <div ref={buttonRef}>
        <PixelButton
          iconOnly
          icon="notebook"
          aria-label="메뉴"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={menuId}
          // 메뉴가 열린 동안 브라우저 툴팁(메뉴)이 메뉴판 위를 가리지 않게 끈다. 닫혀 있을 때는 aria-label이 툴팁이 된다
          {...(open ? { title: "" } : {})}
          onClick={() => setOpen((v) => !v)}
        />
      </div>
      {children}
      {open && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label="메뉴"
          className="pixel-box absolute right-0 z-20 flex flex-col"
          style={{ top: "calc(100% + var(--p) * 2)", padding: "calc(var(--p) * 2)", minWidth: "max-content" }}
        >
          {normal.map(row)}
          {danger.length > 0 && normal.length > 0 && <div aria-hidden className="menu-divider" />}
          {danger.map(row)}
        </div>
      )}
    </div>
  );
}

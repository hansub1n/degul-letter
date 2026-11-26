"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { PixelButton } from "@/shared/components/PixelButton";

type Props = {
  /** 숨긴 눈사람 수. 메뉴 항목에 보여 준다 */
  hiddenCount: number;
  /** 로그인(카카오·구글)한 주인만 로그아웃을 보여 준다. 익명 주인은 로그아웃하면 마을을 잃는다 */
  canLogout: boolean;
  onOpenHidden: () => void;
  onLogout: () => void;
  /** 메뉴 옆에 둘 버튼 (공유하기). 메뉴판은 이 묶음의 오른쪽 끝에 맞춘다 */
  children?: ReactNode;
};

/**
 * 마을 주인 메뉴. 공유 버튼 옆에 둔다.
 * 숨긴 눈사람 목록과, 집 문이 눈에 막혀도 나갈 수 있는 로그아웃이 있다.
 * 집 문 로그아웃은 그대로 둔다.
 */
export function OwnerMenu({ hiddenCount, canLogout, onOpenHidden, onLogout, children }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const gearRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!rootRef.current?.contains(target)) setOpen(false);
      else if (!gearRef.current?.contains(target) && !menuRef.current?.contains(target)) setOpen(false);
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

  const hiddenLabel = hiddenCount > 0 ? `숨긴 눈사람 ${hiddenCount}개` : "숨긴 눈사람";

  return (
    <div ref={rootRef} className="relative flex items-start gap-[calc(var(--p)*4)]">
      <div ref={gearRef}>
        <PixelButton
          iconOnly
          icon="gear"
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
          className="pixel-box absolute right-0 z-20 flex flex-col"
          style={{ top: "calc(100% + var(--p) * 2)", padding: "calc(var(--p) * 2)", minWidth: "max-content" }}
        >
          <button type="button" role="menuitem" className="menu-item text-label" onClick={() => { setOpen(false); onOpenHidden(); }}>
            {hiddenLabel}
          </button>
          {canLogout && (
            <button type="button" role="menuitem" className="menu-item text-label" onClick={() => { setOpen(false); onLogout(); }}>
              로그아웃
            </button>
          )}
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { AirmailFrame, LetterStamp } from "@/domains/letter";
import { PixelButton } from "@/shared/components/PixelButton";
import { PixelPanel } from "@/shared/components/PixelPanel";
import { acquireModalLock } from "@/shared/lib/modalLock";
import { startKakaoLogin } from "../api";
import { LoginMethods } from "./LoginMethods";

type Props = {
  /**
   * page: 첫 화면에서 표지판 대신 띄운다 (뒤 배경이 그대로 보인다)
   * overlay: 친구 마을에서 초대장 티켓을 눌렀을 때 마을 위에 베일을 깔고 띄운다
   */
  variant: "page" | "overlay";
  /** 있으면 "나중에 할게요"와 베일 누르기로 닫는다 (친구 마을로 돌아가기) */
  onClose?: () => void;
};

/** 항공우편 테두리 안의 점선 절취선. 도트 칸으로 찍어서 배율과 상관없이 또렷하게 한다. */
function Perforation() {
  return (
    <div aria-hidden className="flex h-[var(--p)] w-full items-center justify-between">
      {Array.from({ length: 28 }, (_, i) => (
        <span key={i} className="size-[var(--p)] shrink-0 bg-ink" />
      ))}
    </div>
  );
}

/**
 * 내 마을 만들기 초대장: 항공우편 카드 안에서 카카오로 로그인한다.
 * 친구 마을의 초대장 티켓과 첫 화면이 같은 카드를 쓴다. 로그인하면 첫 화면으로 돌아와 닉네임을 입력한다.
 */
export function InviteLogin({ variant, onClose }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const kakao = async () => {
    setBusy(true);
    setError(null);
    try {
      await startKakaoLogin("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "잠시 후 다시 시도해 주세요");
      setBusy(false);
    }
  };

  const overlay = variant === "overlay";

  // 마을 위에 뜰 때는 다른 창처럼 뒤 마을 조작을 멈추고, Esc로 닫는다
  useLayoutEffect(() => (overlay ? acquireModalLock() : undefined), [overlay]);
  useEffect(() => {
    if (!overlay || !onClose) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [overlay, onClose]);

  return (
    <div
      role={overlay ? "dialog" : undefined}
      aria-modal={overlay ? true : undefined}
      aria-labelledby={overlay ? "invite-login-title" : undefined}
      className={`fixed inset-0 flex items-center justify-center overflow-y-auto px-[calc(var(--p)*6)] py-[calc(var(--p)*8)] ${
        overlay ? "z-40 bg-veil" : "z-20"
      }`}
      onClick={overlay && onClose && !busy ? (e) => e.target === e.currentTarget && onClose() : undefined}
    >
      <section aria-labelledby="invite-login-title" className="pixel-rise w-full max-w-[360px]">
        <AirmailFrame>
          <PixelPanel
            tone="paper"
            pad={0}
            flat
            className="relative flex flex-col gap-[calc(var(--p)*6)]"
            style={{ padding: "calc(var(--p) * 8) calc(var(--p) * 5) calc(var(--p) * 7)" }}
          >
            <div className="absolute right-[calc(var(--p)*4)] top-[calc(var(--p)*4)]">
              <LetterStamp letterId="invite" />
            </div>
            <header className="flex flex-col gap-[calc(var(--p)*4)] pt-[calc(var(--p)*1)]">
              <p className="text-label text-roof pr-[calc(var(--p)*22)]">초대장</p>
              <h1 id="invite-login-title" className="text-title pr-[calc(var(--p)*22)]">
                내 마을을
                <br />
                지켜 줄 열쇠
              </h1>
              <p className="text-body text-muted">
                로그인하면 받은 편지를 지켜 주고,
                <br />
                어떤 기기에서든 열어 볼 수 있어요
              </p>
            </header>
            <Perforation />
            <div className="flex flex-col items-center gap-[calc(var(--p)*5)]">
              {error && <p className="text-body text-roof">{error}</p>}
              <LoginMethods busy={busy} onKakao={() => void kakao()} />
              {onClose && (
                <PixelButton variant="ghost" size="sm" disabled={busy} onClick={onClose}>
                  나중에 할게요
                </PixelButton>
              )}
            </div>
          </PixelPanel>
        </AirmailFrame>
      </section>
    </div>
  );
}

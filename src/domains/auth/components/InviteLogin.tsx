"use client";

import { useEffect, useLayoutEffect, useState, useSyncExternalStore } from "react";
import { AirmailFrame, LetterStamp } from "@/domains/letter";
import { PixelButton } from "@/shared/components/PixelButton";
import { PixelPanel } from "@/shared/components/PixelPanel";
import { acquireModalLock } from "@/shared/lib/modalLock";
import { startGoogleLogin, startKakaoLogin } from "../api";
import { detectInApp, externalBrowserUrl, type InAppKind } from "../lib/inAppBrowser";
import { LoginMethods } from "./LoginMethods";

function subscribeInApp(): () => void {
  return () => {};
}

function useInApp(): InAppKind | null {
  const ua = useSyncExternalStore(subscribeInApp, () => navigator.userAgent, () => "");
  return detectInApp(ua);
}

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
 * 내 마을 만들기 초대장: 항공우편 카드 안에서 카카오 또는 구글로 로그인한다.
 * 친구 마을의 초대장 티켓과 첫 화면이 같은 카드를 쓴다. 로그인하면 첫 화면으로 돌아와 닉네임을 입력한다.
 */
export function InviteLogin({ variant, onClose }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const inApp = useInApp();
  // iOS의 카카오톡이 아닌 인앱은 바깥 브라우저를 열 주소가 없다. 구글 단추 대신 안내를 보여 준다.
  const iosNotice = inApp === "ios";

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

  const google = async () => {
    if (inApp === "kakaotalk" || inApp === "android") {
      window.location.assign(externalBrowserUrl(window.location.href, inApp));
      return;
    }
    if (inApp === "ios") return;
    setBusy(true);
    setError(null);
    try {
      await startGoogleLogin("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "잠시 후 다시 시도해 주세요");
      setBusy(false);
    }
  };

  const copyLink = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      window.prompt("이 링크를 복사해서 Safari나 Chrome 주소창에 붙여 넣어요", url);
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
                어느 기기에서든 친구들의 눈사람과 편지가
                <br />
                녹지 않고 내 마을에 남아요
              </p>
            </header>
            <Perforation />
            <div className="flex flex-col items-center gap-[calc(var(--p)*5)]">
              {error && <p className="text-body text-roof">{error}</p>}
              <LoginMethods busy={busy} onKakao={() => void kakao()} onGoogle={iosNotice ? undefined : () => void google()} />
              {iosNotice && (
                <div className="flex w-full flex-col items-center gap-[calc(var(--p)*3)] text-center">
                  <p className="text-body">
                    이 앱에서는 구글 로그인을 열 수 없어요.
                    <br />
                    Safari나 Chrome에서 열어 주세요.
                  </p>
                  <PixelButton size="sm" disabled={busy} onClick={() => void copyLink()}>
                    {copied ? "복사했어요" : "링크 복사"}
                  </PixelButton>
                </div>
              )}
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

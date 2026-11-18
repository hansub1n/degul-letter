"use client";

import { AirmailFrame } from "@/domains/letter/components/AirmailFrame";
import { LetterStamp } from "@/domains/letter";
import { PixelButton } from "@/shared/components/PixelButton";
import { PixelPanel } from "@/shared/components/PixelPanel";
import { LoginMethods } from "@/domains/auth/components/LoginMethods";

type Props = {
  onClose: () => void;
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
 * 시안 B: 화면 전체를 쓰는 항공우편 초대장 카드.
 * InviteTicket·열린 편지와 같은 줄무늬 테두리, 우표, 절취선을 쓴다.
 */
export function LoginLetterB({ onClose }: Props) {
  return (
    <main className="relative z-10 flex min-h-dvh w-full items-center justify-center px-[calc(var(--p)*6)] py-[calc(var(--p)*8)]">
      <section
        aria-labelledby="login-letter-title"
        className="pixel-rise w-full max-w-[360px]"
      >
        <AirmailFrame>
          <PixelPanel
            tone="paper"
            pad={0}
            flat
            className="relative flex flex-col gap-[calc(var(--p)*6)]"
            style={{ padding: "calc(var(--p) * 8) calc(var(--p) * 5) calc(var(--p) * 7)" }}
          >
            <div className="absolute right-[calc(var(--p)*4)] top-[calc(var(--p)*4)]">
              <LetterStamp letterId="login-preview" />
            </div>
            <header className="flex flex-col gap-[calc(var(--p)*4)] pt-[calc(var(--p)*1)]">
              <p className="text-label text-roof pr-[calc(var(--p)*22)]">초대장</p>
              <h1 id="login-letter-title" className="text-title pr-[calc(var(--p)*22)]">
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
              <LoginMethods onKakao={() => undefined} onGoogle={() => undefined} />
              <PixelButton variant="ghost" size="sm" onClick={onClose}>
                나중에 할게요
              </PixelButton>
            </div>
          </PixelPanel>
        </AirmailFrame>
      </section>
    </main>
  );
}

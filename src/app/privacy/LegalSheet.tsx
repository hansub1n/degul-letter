import Link from "next/link";
import type { ReactNode } from "react";
import { LetterStamp } from "@/domains/letter";
import { HomeBackdrop } from "@/domains/village/components/HomeBackdrop";
import { PixelPanel } from "@/shared/components/PixelPanel";

type Props = {
  title: string;
  updated: string;
  children: ReactNode;
  /** 페이지 맨 아래의 다른 문서 링크 */
  footer: ReactNode;
};

/** 눈밭 위에 얹는 약관·개인정보 종이. 게임 화면의 편지지와 같은 재질만 쓴다. */
export function LegalSheet({ title, updated, children, footer }: Props) {
  return (
    <main className="relative min-h-dvh bg-ground">
      <HomeBackdrop />
      <div className="relative z-10 mx-auto flex w-full max-w-[360px] flex-col gap-[calc(var(--p)*5)] px-[calc(var(--p)*4)] py-[calc(var(--p)*8)]">
        <Link href="/" className="text-label w-fit text-ink">
          ← 마을로
        </Link>
        <PixelPanel tone="paper" pad={6} className="relative flex flex-col gap-[calc(var(--p)*5)]">
          <div className="absolute top-[calc(var(--p)*4)] right-[calc(var(--p)*4)]">
            <LetterStamp letterId={title} />
          </div>
          <header className="flex flex-col gap-[calc(var(--p)*2)] pr-[calc(var(--p)*22)]">
            <h1 className="text-title">{title}</h1>
            <p className="text-caption">{updated}</p>
          </header>
          <div className="flex flex-col gap-[calc(var(--p)*5)]">{children}</div>
        </PixelPanel>
        <div className="text-caption text-center">{footer}</div>
      </div>
    </main>
  );
}

export function LegalSection({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-[calc(var(--p)*2)]">
      <h2 className="text-label">{heading}</h2>
      <div className="text-body flex flex-col gap-[calc(var(--p)*2)]">{children}</div>
    </section>
  );
}

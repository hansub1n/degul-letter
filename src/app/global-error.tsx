"use client";

import Link from "next/link";
import localFont from "next/font/local";
import { PixelButton } from "@/shared/components/PixelButton";
import { PixelPanel } from "@/shared/components/PixelPanel";
import "./globals.css";

const galmuri = localFont({
  variable: "--font-pixel",
  src: [
    { path: "../../node_modules/galmuri/dist/Galmuri11.woff2", weight: "400", style: "normal" },
    { path: "../../node_modules/galmuri/dist/Galmuri11-Bold.woff2", weight: "700", style: "normal" },
  ],
  display: "swap",
});

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

/** 루트 레이아웃까지 실패한 오류. 이 파일은 자체 html/body를 연다. */
export default function GlobalError({ reset }: Props) {
  return (
    <html lang="ko" className={`${galmuri.variable} h-full`}>
      <body className="min-h-full">
        <main className="fixed inset-0 flex items-center justify-center bg-ground px-[calc(var(--p)*6)]">
          <PixelPanel className="relative z-10 flex w-full max-w-[320px] flex-col items-center gap-[calc(var(--p)*4)] text-center">
            <p className="text-body break-keep">문제가 생겼어요. 잠시 후 다시 시도해 주세요.</p>
            <div className="flex w-full flex-col gap-[calc(var(--p)*3)]">
              <PixelButton variant="secondary" className="w-full" onClick={reset}>
                다시 시도
              </PixelButton>
              <Link href="/" className="pixel-box pixel-btn text-label relative inline-flex h-11 w-full shrink-0 select-none items-center justify-center whitespace-nowrap px-[calc(var(--p)*5)]" data-variant="primary">
                첫 화면으로
              </Link>
            </div>
          </PixelPanel>
        </main>
      </body>
    </html>
  );
}

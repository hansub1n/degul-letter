"use client";

import localFont from "next/font/local";
import { ErrorScreen } from "@/domains/village";
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
        <ErrorScreen title="문제가 생겼어요" description="잠시 후 다시 시도해 주세요" onRetry={reset} />
      </body>
    </html>
  );
}

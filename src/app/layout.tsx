import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { TIME_OF_DAY_SCRIPT } from "@/shared/hooks/useTimeOfDay";
import "./globals.css";

// 갈무리체: 한글 도트 글꼴 (SIL Open Font License 1.1). 12px의 배수에서 가장 또렷하다.
const galmuri = localFont({
  variable: "--font-pixel",
  src: [
    { path: "../../node_modules/galmuri/dist/Galmuri11.woff2", weight: "400", style: "normal" },
    { path: "../../node_modules/galmuri/dist/Galmuri11-Bold.woff2", weight: "700", style: "normal" },
  ],
  display: "swap",
});

// 작은 갈무리체(10px에서 또렷함): 마을 눈사람 이름표처럼 12px보다 작게 써야 하는 캔버스 글자용
const galmuriSmall = localFont({
  variable: "--font-pixel-small",
  src: [{ path: "../../node_modules/galmuri/dist/Galmuri9.woff2", weight: "400", style: "normal" }],
  display: "swap",
});

export const metadata: Metadata = {
  title: "데굴레터",
  description: "눈덩이를 굴려 친구의 마을에 눈사람을 세우고, 크리스마스에 열어 볼 편지를 남겨요.",
  openGraph: {
    title: "데굴레터",
    description: "친구 마을에 눈사람을 세우고, 크리스마스에 열어 볼 편지를 남겨요.",
    type: "website",
    locale: "ko_KR",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#1A1730",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // data-time은 아래 스크립트가 첫 칠 전에 정하므로 서버 HTML과 다를 수 있다
    <html lang="ko" className={`${galmuri.variable} ${galmuriSmall.variable} h-full`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: TIME_OF_DAY_SCRIPT }} />
      </head>
      <body className="min-h-full">{children}</body>
    </html>
  );
}

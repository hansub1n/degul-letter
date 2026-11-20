import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { TIME_OF_DAY_SCRIPT } from "@/shared/hooks/useTimeOfDay";
import { SITE_DESCRIPTION, SITE_NAME, SITE_SHARE_DESCRIPTION, SITE_TITLE, SITE_URL } from "@/shared/lib/site";
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

// 공유 이미지(opengraph-image.png, twitter-image.png)·아이콘(icon.svg, apple-icon.png, favicon.ico)·manifest.ts는
// 파일 규칙으로 Next가 붙인다. 공유 이미지는 마을 앞 나무 표지판과 눈 조각들, 탭 아이콘은 오른쪽으로 미는 캐릭터,
// 홈 화면 아이콘은 밤 마을에서 눈덩이를 미는 장면이다.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_TITLE, template: "%s · 데굴레터" },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: ["데굴레터", "눈사람", "크리스마스", "편지", "픽셀 게임"],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    locale: "ko_KR",
    siteName: SITE_NAME,
    // 카톡 미리보기: "데굴레터 / 한 줄 설명" 두 줄. 탭 제목·검색 설명은 위의 title·description을 쓴다
    title: SITE_NAME,
    description: SITE_SHARE_DESCRIPTION,
  },
  twitter: { card: "summary_large_image", title: SITE_NAME, description: SITE_SHARE_DESCRIPTION },
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

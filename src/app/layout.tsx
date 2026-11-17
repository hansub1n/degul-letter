import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
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

export const metadata: Metadata = {
  title: "데굴레터",
  description: "눈덩이를 굴려 친구의 마을에 눈사람을 세우고, 크리스마스에 열어 볼 편지를 남겨요.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#1A1730",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${galmuri.variable} h-full`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}

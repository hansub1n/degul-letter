import type { Metadata } from "next";
import { LoginDone } from "@/domains/auth";

export const metadata: Metadata = {
  title: "로그인 중 · 데굴레터",
  robots: { index: false, follow: false },
};

export default function LoginDonePage() {
  return <LoginDone />;
}

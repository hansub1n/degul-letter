import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { LoginPreview } from "./LoginPreview";

export const metadata: Metadata = {
  title: "로그인 시안 미리보기",
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: Promise<{ v?: string | string[] }>;
};

/** 개발 전용. 앱의 다른 화면에서는 연결하지 않는다. `?v=a` 또는 `?v=b`로 시안을 고른다. */
export default function LoginPreviewPage({ searchParams }: Props) {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <Suspense fallback={null}>
      <LoginPreviewLoader searchParams={searchParams} />
    </Suspense>
  );
}

async function LoginPreviewLoader({ searchParams }: Props) {
  const params = await searchParams;
  const raw = Array.isArray(params.v) ? params.v[0] : params.v;
  const variant = raw === "b" ? "b" : "a";
  return <LoginPreview variant={variant} />;
}

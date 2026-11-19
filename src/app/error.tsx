"use client";

import { ErrorScreen } from "@/domains/village";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

/** 라우트 안에서 처리하지 못한 오류. 다시 그리거나 첫 화면으로 갈 수 있다. */
export default function ErrorPage({ reset }: Props) {
  return <ErrorScreen title="문제가 생겼어요" description="잠시 후 다시 시도해 주세요" onRetry={reset} />;
}

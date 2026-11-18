"use client";

import { useRouter } from "next/navigation";
import { PixelButton } from "@/shared/components/PixelButton";
import { PixelPanel } from "@/shared/components/PixelPanel";

type Props = {
  /** 짧은 안내 문장 */
  message: string;
  /** 있으면 "다시 시도" 단추를 보여 준다 */
  onRetry?: () => void;
};

/**
 * 길을 잃었거나 화면을 그리지 못했을 때 쓰는 안내.
 * 로그인 실패 화면(LoginDone)과 같은 눈밭 + 눈 재질 카드다.
 */
export function ErrorScreen({ message, onRetry }: Props) {
  const router = useRouter();
  return (
    <main className="fixed inset-0 flex items-center justify-center bg-ground px-[calc(var(--p)*6)]">
      <PixelPanel className="relative z-10 flex w-full max-w-[320px] flex-col items-center gap-[calc(var(--p)*4)] text-center">
        <p className="text-body break-keep">{message}</p>
        <div className="flex w-full flex-col gap-[calc(var(--p)*3)]">
          {onRetry && (
            <PixelButton variant="secondary" className="w-full" onClick={onRetry}>
              다시 시도
            </PixelButton>
          )}
          <PixelButton variant="primary" className="w-full" onClick={() => router.push("/")}>
            첫 화면으로
          </PixelButton>
        </div>
      </PixelPanel>
    </main>
  );
}

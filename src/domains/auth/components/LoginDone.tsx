"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { PixelButton } from "@/shared/components/PixelButton";
import { PixelDialog } from "@/shared/components/PixelDialog";
import { completeLogin } from "../api";

/**
 * 카카오에서 돌아온 뒤 잠깐 보이는 화면.
 * 주소 # 뒤의 일회용 열쇠로 세션을 만들고, 로그인 전에 있던 화면으로 돌아간다.
 */
export function LoginDone() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  // 개발 모드(StrictMode)는 effect를 두 번 돌린다. 두 번째는 이미 지운 주소를 읽어 "실패"로 보이므로 한 번만 돈다
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const params = new URLSearchParams(window.location.hash.slice(1));
    // 열쇠가 주소창·방문 기록에 남지 않게 바로 지운다
    window.history.replaceState(null, "", window.location.pathname);
    const userId = params.get("userId");
    const secret = params.get("secret");
    const returnTo = params.get("returnTo") ?? "/";
    (async () => {
      if (!userId || !secret) throw new Error(params.get("error") ?? "로그인하지 못했어요");
      try {
        await completeLogin(userId, secret);
      } catch (e) {
        console.error(e);
        throw new Error("로그인하지 못했어요. 다시 시도해 주세요");
      }
      router.replace(returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/");
    })().catch((e: unknown) => setError(e instanceof Error ? e.message : "로그인하지 못했어요"));
  }, [router]);

  return (
    <main className="fixed inset-0 bg-ground">
      {/* 다른 확인 창과 같은 공용 창(크기·여백·베일). 로그인 중에는 닫을 수 없다 */}
      <PixelDialog title={error ? "로그인하지 못했어요" : "로그인하는 중"} hideHeader closeOnVeil={false} onClose={() => error && router.replace("/")}>
        <div className="flex flex-col items-center gap-[calc(var(--p)*4)] px-[calc(var(--p)*2)] pb-[calc(var(--p)*1)] pt-[calc(var(--p)*3)] text-center break-keep">
          <p className="text-body">{error ?? "로그인하는 중…"}</p>
          {error && (
            <PixelButton variant="primary" className="w-full" onClick={() => router.replace("/")}>
              처음으로
            </PixelButton>
          )}
        </div>
      </PixelDialog>
    </main>
  );
}

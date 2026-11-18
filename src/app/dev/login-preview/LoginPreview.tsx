"use client";

import { useState } from "react";
import { InviteLogin } from "@/domains/auth";
import { HomeBackdrop } from "@/domains/village/components/HomeBackdrop";
import { PixelButton } from "@/shared/components/PixelButton";
import { LoginModalA } from "./LoginModalA";

type Variant = "a" | "b";

/**
 * 개발용 로그인 시안 미리보기. 앱 화면에서는 여기로 가는 링크를 두지 않는다.
 * 닫아도 로직은 바뀌지 않고, 다시 보기 단추만 보여 시안을 계속 볼 수 있게 한다.
 */
export function LoginPreview({ variant }: { variant: Variant }) {
  const [open, setOpen] = useState(true);

  return (
    <div className="relative min-h-dvh bg-ground">
      <HomeBackdrop />
      {variant === "a" && open && <LoginModalA onClose={() => setOpen(false)} />}
      {variant === "b" && open && <InviteLogin variant="page" onClose={() => setOpen(false)} />}
      {!open && (
        <div className="relative z-10 flex min-h-dvh items-center justify-center p-[calc(var(--p)*6)]">
          <PixelButton variant="primary" onClick={() => setOpen(true)}>
            시안 다시 보기
          </PixelButton>
        </div>
      )}
    </div>
  );
}

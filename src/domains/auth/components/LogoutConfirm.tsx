"use client";

import { useState } from "react";
import { PixelButton } from "@/shared/components/PixelButton";
import { PixelDialog } from "@/shared/components/PixelDialog";
import { PixelIcon } from "@/shared/components/PixelIcon";
import { logout } from "../api";

type Props = {
  onClose: () => void;
};

/**
 * 로그아웃 확인 창. 다른 확인 창(눈사람이 녹아 버려요)과 같은 베일·눈 재질 창이다.
 * 나가 있어도 편지는 계속 쌓인다는 걸 알려 줘서, 로그아웃이 무섭지 않게 한다.
 * 취소는 제목 줄의 ✕(또는 Esc·바깥 누르기)가 맡는다.
 */
export function LogoutConfirm({ onClose }: Props) {
  const [busy, setBusy] = useState(false);

  return (
    <PixelDialog title="로그아웃할까요?" closeOnVeil={!busy} onClose={onClose}>
      <div className="flex min-h-full w-full flex-1 flex-col justify-center self-stretch">
        <div className="flex flex-col items-center gap-[calc(var(--p)*4)] px-[calc(var(--p)*2)] pb-[calc(var(--p)*1)] pt-[calc(var(--p)*3)] text-center">
          <PixelIcon name="houseDoor" scale={5} />
          <p className="text-body text-muted">
            나가 있는 동안에도
            <br />
            편지는 우체통에 쌓여요
          </p>
          <PixelButton
            variant="primary"
            className="w-full"
            disabled={busy}
            onClick={() => {
              setBusy(true);
              void logout();
            }}
          >
            {busy ? "로그아웃하는 중…" : "로그아웃"}
          </PixelButton>
        </div>
      </div>
    </PixelDialog>
  );
}

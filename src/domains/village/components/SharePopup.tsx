"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { PixelButton } from "@/shared/components/PixelButton";
import { PixelDialog } from "@/shared/components/PixelDialog";
import { PixelToast } from "@/shared/components/PixelToast";
import { villageUrl } from "../share";

type Props = {
  code: string;
  onClose: () => void;
};

/** 공유하기 팝업: 데스크톱(또는 공유 창이 없는 브라우저)에서 마을 주소를 보여 주고 복사 버튼으로 복사한다 */
export function SharePopup({ code, onClose }: Props) {
  const url = villageUrl(code);
  /** 복사할 때마다 알림을 다시 띄우려고 시각을 키로 쓴다 */
  const [copiedAt, setCopiedAt] = useState<number | null>(null);
  useEffect(() => {
    if (copiedAt === null) return;
    const id = window.setTimeout(() => setCopiedAt(null), 2000);
    return () => window.clearTimeout(id);
  }, [copiedAt]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedAt(Date.now());
    } catch {
      window.prompt("이 링크를 복사해서 친구에게 보내 주세요", url);
    }
  };

  return (
    <PixelDialog title="공유하기" onClose={onClose}>
      <div className="flex flex-col gap-[calc(var(--p)*5)] pt-[calc(var(--p)*2)]">
        <p className="text-body text-muted text-center">
          링크를 받은 친구가 내 마을에
          <br />
          눈사람을 세우고 크리스마스 편지를 남겨요
        </p>
        <div className="flex flex-col gap-[calc(var(--p)*2)]">
          <p className="text-label">링크 공유</p>
          <div className="flex gap-[calc(var(--p)*2)]">
            <input
              readOnly
              value={url}
              aria-label="마을 링크"
              onFocus={(e) => e.currentTarget.select()}
              className="pixel-box pixel-box-flat pixel-field text-body h-11 min-w-0 flex-1 px-[calc(var(--p)*3)]"
            />
            <PixelButton variant="primary" className="shrink-0" onClick={() => void copy()}>
              복사
            </PixelButton>
          </div>
        </div>
      </div>
      {/* 창이 움직이는 효과(transform) 안에 두면 창 기준으로 붙으므로 body로 꺼내 화면 아래에 띄운다. 창 베일(z-50)보다 위 */}
      {copiedAt !== null &&
        createPortal(
          <div className="relative z-[60]">
            <PixelToast key={copiedAt}>링크를 복사했어요. 친구에게 보내 주세요!</PixelToast>
          </div>,
          document.body,
        )}
    </PixelDialog>
  );
}

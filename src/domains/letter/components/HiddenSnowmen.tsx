"use client";

import { useState } from "react";
import { PixelButton } from "@/shared/components/PixelButton";
import { PixelDialog } from "@/shared/components/PixelDialog";

/** 마을 주인이 숨긴 눈사람. 눈사람과 편지는 한 덩어리라, 숨긴 동안 그 편지는 우체통에서 빠진다 */
export type HiddenSnowmanSummary = { id: string; authorName: string; hasLetter: boolean };

type Props = {
  items: readonly HiddenSnowmanSummary[];
  /** 숨긴 눈사람을 다시 보이게 한다. 실패하면 예외를 던진다 */
  onUnhide: (snowmanId: string) => Promise<void>;
  onClose: () => void;
};

/**
 * 숨긴 눈사람 목록. 주인 메뉴에서 연다. 우체통과는 따로다.
 * 다시 보이게 하면 같은 자리에 눈사람이 나타나고, 편지도 우체통에 돌아온다.
 */
export function HiddenSnowmen({ items, onUnhide, onClose }: Props) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  const unhide = async (id: string) => {
    setBusyId(id);
    setFailed(false);
    try {
      await onUnhide(id);
    } catch {
      setFailed(true);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <PixelDialog
      title="숨긴 눈사람"
      align="start"
      badge={String(items.length)}
      caption="같은 자리에 다시 나타나고 편지도 돌아와요"
      onClose={onClose}
      footer={
        failed ? (
          <p role="alert" className="text-caption w-full text-center">
            처리하지 못했어요. 잠시 후 다시 눌러 주세요
          </p>
        ) : undefined
      }
    >
      {items.length === 0 ? (
        <p className="text-caption py-[calc(var(--p)*4)] text-center">숨긴 눈사람이 없어요</p>
      ) : (
        <ul className="flex flex-col gap-[calc(var(--p)*3)]">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-[calc(var(--p)*3)]">
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-label truncate">{item.authorName}</span>
                <span className="text-caption">{item.hasLetter ? "편지가 들어 있어요" : "편지 없음"}</span>
              </span>
              <PixelButton size="sm" disabled={busyId !== null} onClick={() => void unhide(item.id)}>
                다시 보이기
              </PixelButton>
            </li>
          ))}
        </ul>
      )}
    </PixelDialog>
  );
}

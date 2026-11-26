"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { PixelButton } from "@/shared/components/PixelButton";
import { PixelDialog } from "@/shared/components/PixelDialog";
import { PixelToast } from "@/shared/components/PixelToast";
import { describeError, reportClientError } from "@/shared/lib/clientError";
import { CONTEST_NOTICE_AFTER_LETTER } from "@/shared/lib/contest";
import { shareStoryCard } from "../share";
import { renderStoryCard, STORY_CARD_HEIGHT, STORY_CARD_WIDTH, type StoryCardInput } from "../lib/storyCard";

type Props = StoryCardInput & {
  onClose: () => void;
};

type Card = { blob: Blob; url: string };

/** 인스타 스토리용 카드(1080x1920)를 미리 보여 주고, 눈사람 대회 참여 안내와 함께 공유하거나 내려받게 하는 창 */
export function StoryShareDialog({ villageName, snowmen, focusId, player, onClose }: Props) {
  const [card, setCard] = useState<Card | null>(null);
  const [failed, setFailed] = useState(false);
  const [sharing, setSharing] = useState(false);
  /** 알림을 다시 띄우려고 시각을 키로 쓴다 */
  const [toast, setToast] = useState<{ text: string; at: number } | null>(null);

  // 창이 열릴 때 한 번 만든다. 공유 창은 버튼을 누른 순간에만 열 수 있어서, 눌렀을 때 만들지 않고 미리 만들어 둔다
  useEffect(() => {
    let alive = true;
    let url: string | null = null;
    renderStoryCard({ villageName, snowmen, focusId, player })
      .then((blob) => {
        if (!alive) return;
        url = URL.createObjectURL(blob);
        setCard({ blob, url });
      })
      .catch((e) => {
        console.error(e);
        reportClientError("story-card", describeError(e));
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
    // 창이 열려 있는 동안 재료는 바뀌지 않는다 (처음 값으로 한 번만 만든다)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(id);
  }, [toast]);

  const share = () => {
    if (!card || sharing) return;
    setSharing(true);
    void shareStoryCard(card.blob)
      .then((result) => {
        if (result === "downloaded") setToast({ text: "이미지를 저장했어요. 인스타 스토리에 올려 주세요!", at: Date.now() });
      })
      .finally(() => setSharing(false));
  };

  return (
    <PixelDialog
      title="스토리 카드"
      onClose={onClose}
      footer={
        <>
          <PixelButton onClick={onClose}>닫기</PixelButton>
          <PixelButton variant="primary" icon="share" className="min-w-0 flex-1" disabled={!card || sharing} onClick={share}>
            스토리에 올리기
          </PixelButton>
        </>
      }
    >
      <div className="flex flex-col items-center gap-[calc(var(--p)*4)] pt-[calc(var(--p)*2)]">
        <div
          className="pixel-box pixel-box-flat flex items-center justify-center overflow-hidden bg-snow-shade"
          style={{ aspectRatio: `${STORY_CARD_WIDTH} / ${STORY_CARD_HEIGHT}`, height: "min(42dvh, 420px)" }}
        >
          {card ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={card.url}
              alt="인스타 스토리용 공유 카드 미리보기"
              className="block h-full w-full [image-rendering:pixelated]"
            />
          ) : (
            <p className="text-caption px-[calc(var(--p)*3)] text-center">
              {failed ? "카드를 만들지 못했어요. 잠시 후 다시 열어 주세요" : "카드를 만드는 중…"}
            </p>
          )}
        </div>
        <p className="text-body break-keep text-center">{CONTEST_NOTICE_AFTER_LETTER}</p>
      </div>
      {toast &&
        createPortal(
          <div className="relative z-[60]">
            <PixelToast key={toast.at}>{toast.text}</PixelToast>
          </div>,
          document.body,
        )}
    </PixelDialog>
  );
}

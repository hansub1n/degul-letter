"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { PixelButton } from "@/shared/components/PixelButton";
import { PixelDialog } from "@/shared/components/PixelDialog";
import { PixelField } from "@/shared/components/PixelField";
import { PixelToast } from "@/shared/components/PixelToast";
import { describeError, reportClientError } from "@/shared/lib/clientError";
import { profanityProblem } from "@/shared/lib/profanity";
import { STORY_NOTICE } from "@/shared/lib/storyShare";
import { isTouchScreen } from "@/shared/lib/touchScreen";
import { shareStoryCard } from "../share";
import {
  renderStoryCard,
  STORY_CARD_HEIGHT,
  STORY_CARD_WIDTH,
  STORY_SPEECH_DEFAULT,
  STORY_SPEECH_MAX,
  STORY_SPEECH_PRESETS,
  type StoryCardInput,
} from "../lib/storyCard";

/** 말풍선을 고치는 동안 카드를 매 글자마다 다시 그리지 않게 잠깐 기다린다 */
const REDRAW_DELAY_MS = 300;

type Props = StoryCardInput & {
  onClose: () => void;
};

/** 만들어 둔 카드와, 그 카드에 들어간 말풍선 */
type Card = { blob: Blob; url: string; speech: string };

/**
 * 인스타 스토리용 카드(1080x1920)를 미리 보여 주고, 데굴이 말풍선을 고친 뒤 공유하거나 내려받게 하는 창.
 * 말풍선은 이미지에만 들어가고 어디에도 저장하지 않는다.
 */
export function StoryShareDialog({ villageName, snowmen, focusId, onClose }: Props) {
  const [speech, setSpeech] = useState("");
  /**
   * 휴대폰이면 공유 창으로 인스타에 바로 올리고, 데스크톱이면 이미지를 저장한다 (인스타 스토리는 휴대폰 앱에서만 올릴 수 있다).
   */
  const [mobile] = useState(() => isTouchScreen() && typeof navigator.share === "function");
  const speechProblem = profanityProblem(speech, "text");
  /** 카드에 넣을 말풍선: 금칙어가 있으면 고칠 때까지 이전 카드를 둔다 */
  const [drawn, setDrawn] = useState("");
  const [card, setCard] = useState<Card | null>(null);
  const [failed, setFailed] = useState(false);
  const [sharing, setSharing] = useState(false);
  /** 알림을 다시 띄우려고 시각을 키로 쓴다 */
  const [toast, setToast] = useState<{ text: string; at: number } | null>(null);

  // 말풍선을 다 고치고 잠깐 멈추면 그 글로 다시 그린다
  useEffect(() => {
    if (speechProblem) return;
    const id = window.setTimeout(() => setDrawn(speech.trim()), REDRAW_DELAY_MS);
    return () => window.clearTimeout(id);
  }, [speech, speechProblem]);

  // 공유 창은 버튼을 누른 순간에만 열 수 있어서, 눌렀을 때 만들지 않고 미리 만들어 둔다
  useEffect(() => {
    let alive = true;
    let url: string | null = null;
    renderStoryCard({ villageName, snowmen, focusId, speech: drawn })
      .then((blob) => {
        if (!alive) return;
        url = URL.createObjectURL(blob);
        setCard({ blob, url, speech: drawn });
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
    // 눈사람 재료는 창이 열려 있는 동안 바뀌지 않는다. 말풍선이 바뀔 때만 다시 그린다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawn]);

  /** 지금 보이는 카드가 입력한 말풍선과 같을 때만 올릴 수 있다 (다시 그리는 중이거나 금칙어가 있으면 기다린다) */
  const ready = card !== null && !speechProblem && card.speech === speech.trim();

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(id);
  }, [toast]);

  const share = () => {
    if (!card || !ready || sharing) return;
    setSharing(true);
    void shareStoryCard(card.blob)
      .then((result) => {
        if (result === "downloaded") {
          setToast({
            text: mobile ? "이미지를 저장했어요. 인스타 스토리에 올려 주세요!" : "이미지를 저장했어요!",
            at: Date.now(),
          });
        }
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
          <PixelButton variant="primary" icon="share" className="min-w-0 flex-1" disabled={!ready || sharing} onClick={share}>
            {mobile ? "스토리에 올리기" : "이미지 저장하기"}
          </PixelButton>
        </>
      }
    >
      <div className="flex flex-col items-center gap-[calc(var(--p)*4)] pt-[calc(var(--p)*2)]">
        <div
          className="pixel-box pixel-box-flat flex items-center justify-center overflow-hidden bg-snow-shade"
          style={{ aspectRatio: `${STORY_CARD_WIDTH} / ${STORY_CARD_HEIGHT}`, height: "min(36dvh, 400px)" }}
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
        <div className="flex w-full flex-col gap-[calc(var(--p)*3)]">
          <PixelField
            label="데굴이에게 한마디 시키기"
            hint={speechProblem ? <span className="text-roof">{speechProblem}</span> : `${[...speech].length}/${STORY_SPEECH_MAX}`}
            // 비워 두면 기본 문구가 그대로 들어간다
            placeholder={STORY_SPEECH_DEFAULT}
            value={speech}
            maxLength={STORY_SPEECH_MAX}
            // 한글은 조합 중에 maxLength를 한 글자 넘길 수 있어서 직접 30자로 자른다
            onChange={(e) => setSpeech([...e.target.value].slice(0, STORY_SPEECH_MAX).join(""))}
          />
          {/* 예시 문구: 테두리 없는 작은 꼬리표를 한 줄로 두고, 넘치면 옆으로 민다. 누르면 입력칸에 그대로 들어간다 */}
          <div className="speech-chips flex gap-[calc(var(--p)*2)] overflow-x-auto" role="group" aria-label="예시 문구">
            {STORY_SPEECH_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                // 비워 두면 기본 문구가 들어가므로, 빈칸일 때는 기본 문구 꼬리표가 골라진 것으로 보인다
                aria-pressed={(speech.trim() || STORY_SPEECH_DEFAULT) === preset}
                className="speech-chip text-caption shrink-0"
                onClick={() => setSpeech(preset)}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>
        <p className="text-caption break-keep text-center">
          {STORY_NOTICE}
        </p>
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

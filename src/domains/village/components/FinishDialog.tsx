"use client";

import { useEffect, useId, useRef, useState } from "react";
import { isLetterOpen, LETTER_MAX_LENGTH, LetterStamp } from "@/domains/letter";
import { PixelButton } from "@/shared/components/PixelButton";
import { PixelDialog } from "@/shared/components/PixelDialog";
import { PixelField } from "@/shared/components/PixelField";

type Submit = (result: { name: string; letter: string }) => void;

type Props = (
  /** 친구: 닉네임을 정하고, 마을 주인에게 편지를 남긴다 */
  | { mode: "visitor"; recipient: string }
  /** 마을 주인: 닉네임을 정하고, 크리스마스의 나에게 편지를 남긴다 */
  | { mode: "owner" }
) & {
  onSubmit: Submit;
  /** 취소·Esc: 저장하지 않고 닫는다 (눈사람 옆 말풍선의 "편지 쓰기"로 다시 열 수 있다) */
  onCancel: () => void;
};

const FORM_ID = "finish-dialog-form";

/** 눈사람을 완성하면 뜨는 창 */
export function FinishDialog(props: Props) {
  // 한 폰을 여러 사람이 돌려 쓸 수 있으니 닉네임은 매번 빈칸에서 새로 쓴다
  const [nickname, setNickname] = useState("");
  const [letter, setLetter] = useState("");
  const [confirming, setConfirming] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const keepWritingRef = useRef<HTMLButtonElement>(null);
  const messageId = useId();
  const owner = props.mode === "owner";
  const name = nickname.trim();
  const ready = Boolean(name && letter.trim());

  const requestClose = () => setConfirming(true);
  const keepWriting = () => {
    setConfirming(false);
    // 적어 둔 글은 그대로 두고, 이전에 쓰던 입력칸으로 초점을 되돌린다
    requestAnimationFrame(() => {
      const form = formRef.current;
      if (!form) return;
      const letterField = form.querySelector<HTMLTextAreaElement>("textarea");
      const nickField = form.querySelector<HTMLInputElement>("input");
      (letterField?.value ? letterField : nickField)?.focus({ preventScroll: true });
    });
  };

  useEffect(() => {
    if (!confirming) return;
    keepWritingRef.current?.focus({ preventScroll: true });
  }, [confirming]);

  // 눈사람 하나 = 편지 한 통. 친구도 주인도 편지를 꼭 쓴다.
  const submit = () => {
    if (!ready) return;
    props.onSubmit({ name, letter: letter.trim() });
  };

  return (
    <PixelDialog
      title="눈사람 완성!"
      icon="star"
      onClose={confirming ? keepWriting : requestClose}
      closeOnVeil={!confirming}
      cover={
        confirming ? (
          <div
            className="absolute inset-0 z-10 flex items-center justify-center p-[calc(var(--p)*4)]"
            // 창은 항상 흰 눈 재질이라, 마을 위 흰 베일 대신 밤 모드와 같은 --night 40% 베일로 본문을 가라앉힌다
            style={{ background: "color-mix(in srgb, var(--night) 40%, transparent)" }}
          >
            <div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby={messageId}
              data-tone="snow"
              className="pixel-box pixel-rise flex w-full max-w-[280px] flex-col gap-[calc(var(--p)*4)] text-ink"
              style={{ padding: "calc(var(--p) * 5)" }}
            >
              <p id={messageId} className="text-body text-center">
                편지 없이 나가면 눈사람이 녹아 사라져요
              </p>
              <div className="flex gap-[calc(var(--p)*4)]">
                <PixelButton className="flex-1" onClick={props.onCancel}>
                  나가기
                </PixelButton>
                <PixelButton ref={keepWritingRef} variant="primary" className="flex-1" onClick={keepWriting}>
                  계속 쓰기
                </PixelButton>
              </div>
            </div>
          </div>
        ) : null
      }
      footer={
        <>
          <PixelButton className="flex-1" onClick={requestClose}>
            취소
          </PixelButton>
          <PixelButton
            variant="primary"
            type="submit"
            form={FORM_ID}
            icon="envelope"
            aria-label="편지 넣고 눈사람 세우기"
            className="flex-1"
            disabled={!ready}
          >
            보내기
          </PixelButton>
        </>
      }
    >
      <form
        ref={formRef}
        id={FORM_ID}
        className="flex flex-col gap-[calc(var(--p)*4)]"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <PixelField
          label="닉네임"
          value={nickname}
          maxLength={10}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="눈사람과 편지에 쓰여요"
        />
        <PixelField
          multiline
          tone="paper"
          adornment={
            <span className="absolute right-[calc(var(--p)*2)] top-[calc(var(--p)*2)]">
              <LetterStamp />
            </span>
          }
          label={owner ? "크리스마스의 나에게" : `${props.recipient}에게`}
          hint={`${letter.length}/${LETTER_MAX_LENGTH}`}
          value={letter}
          maxLength={LETTER_MAX_LENGTH}
          onChange={(e) => setLetter(e.target.value)}
          placeholder={
            isLetterOpen()
              ? "한 줄이어도 좋아요. 지금 바로 열어 볼 수 있어요."
              : owner
                ? "한 줄이어도 좋아요. 친구들 편지와 함께 12월 25일에 열려요."
                : "한 줄이어도 좋아요. 12월 25일에 열려요."
          }
          rows={5}
        />
      </form>
    </PixelDialog>
  );
}

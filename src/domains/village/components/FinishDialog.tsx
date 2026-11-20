"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { isLetterOpen, LETTER_MAX_LENGTH, LetterStamp } from "@/domains/letter";
import { PixelButton } from "@/shared/components/PixelButton";
import { PixelDialog } from "@/shared/components/PixelDialog";
import { PixelField } from "@/shared/components/PixelField";
import { NICKNAME_MAX } from "../types";
import { LeaveConfirm } from "./LeaveConfirm";

type Submit = (result: { name: string; letter: string }) => void;

type Props = (
  /** 친구: 닉네임을 정하고, 마을 주인에게 편지를 남긴다 */
  | { mode: "visitor"; recipient: string }
  /** 마을 주인: 닉네임을 정하고, 크리스마스의 나에게 편지를 남긴다 */
  | { mode: "owner" }
) & {
  onSubmit: Submit;
  /** 확인 화면에서 "그냥 나가기": 저장하지 않고 닫는다 (눈사람 옆 말풍선의 "편지 쓰기"로 다시 열 수 있다) */
  onCancel: () => void;
};

const FORM_ID = "finish-dialog-form";

/** 눈사람을 완성하면 뜨는 창 */
export function FinishDialog(props: Props) {
  // 한 폰을 여러 사람이 돌려 쓸 수 있으니 닉네임은 매번 빈칸에서 새로 쓴다
  const [nickname, setNickname] = useState("");
  const [letter, setLetter] = useState("");
  const [confirmingLeave, setConfirmingLeave] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const panelHeightRef = useRef(0);
  const [panelMinHeight, setPanelMinHeight] = useState<number | undefined>();
  const owner = props.mode === "owner";
  const name = nickname.trim();
  const ready = Boolean(name && letter.trim());

  // 쓰기 화면의 창 높이를 재 두고, 확인 화면에서도 같은 크기를 유지한다
  useLayoutEffect(() => {
    if (confirmingLeave) return;
    const panel = formRef.current?.closest<HTMLElement>('[role="dialog"]');
    if (!panel) return;
    const measure = () => {
      panelHeightRef.current = panel.offsetHeight;
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(panel);
    return () => ro.disconnect();
  }, [confirmingLeave]);

  const requestClose = () => {
    const panel = formRef.current?.closest<HTMLElement>('[role="dialog"]');
    const height = panel?.offsetHeight || panelHeightRef.current;
    if (height) setPanelMinHeight(height);
    setConfirmingLeave(true);
  };
  const keepWriting = () => {
    setConfirmingLeave(false);
    // 적어 둔 글은 그대로 두고, 이전에 쓰던 입력칸으로 초점을 되돌린다
    requestAnimationFrame(() => {
      const form = formRef.current;
      if (!form) return;
      const letterField = form.querySelector<HTMLTextAreaElement>("textarea");
      const nickField = form.querySelector<HTMLInputElement>("input");
      (letterField?.value ? letterField : nickField)?.focus({ preventScroll: true });
    });
  };

  // 눈사람 하나 = 편지 한 통. 친구도 주인도 편지를 꼭 쓴다.
  const submit = () => {
    if (!ready) return;
    props.onSubmit({ name, letter: letter.trim() });
  };

  return (
    <PixelDialog
      // 완성 축하 뒤에 이어지는 창이라 베일과 창이 천천히 올라온다
      soft
      title={confirmingLeave ? "눈사람이 녹아 버려요" : "눈사람 완성!"}
      icon={confirmingLeave ? undefined : "star"}
      hideHeader={confirmingLeave}
      closeOnVeil
      onClose={confirmingLeave ? keepWriting : requestClose}
      minHeight={confirmingLeave ? panelMinHeight : undefined}
      footer={
        confirmingLeave ? undefined : (
          <PixelButton
            variant="primary"
            type="submit"
            form={FORM_ID}
            icon="envelope"
            aria-label="편지 넣고 눈사람 세우기"
            className="w-full"
            disabled={!ready}
          >
            보내기
          </PixelButton>
        )
      }
    >
      {confirmingLeave && (
        <div className="flex min-h-full w-full flex-1 flex-col justify-center self-stretch">
          <LeaveConfirm onKeepWriting={keepWriting} onLeave={props.onCancel} />
        </div>
      )}
      <form
          ref={formRef}
          id={FORM_ID}
          className={`flex flex-col gap-[calc(var(--p)*4)] ${confirmingLeave ? "hidden" : ""}`}
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <PixelField
            label="닉네임"
            hint={`${nickname.length}/${NICKNAME_MAX}`}
            value={nickname}
            maxLength={NICKNAME_MAX}
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

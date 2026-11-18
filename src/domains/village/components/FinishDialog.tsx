"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { isLetterOpen, LETTER_MAX_LENGTH, LetterStamp } from "@/domains/letter";
import { PixelButton } from "@/shared/components/PixelButton";
import { PixelDialog } from "@/shared/components/PixelDialog";
import { PixelField } from "@/shared/components/PixelField";
import { SantaSleighLoader } from "@/shared/components/SantaSleighLoader";
import { LeaveConfirm } from "./LeaveConfirm";

type Submit = (result: { name: string; letter: string }) => void | Promise<void>;

type Props = (
  /** 친구: 닉네임을 정하고, 마을 주인에게 편지를 남긴다 */
  | { mode: "visitor"; recipient: string }
  /** 마을 주인: 닉네임을 정하고, 크리스마스의 나에게 편지를 남긴다 */
  | { mode: "owner" }
) & {
  onSubmit: Submit;
  /** 확인 화면에서 "그냥 나가기": 저장하지 않고 닫는다 (눈사람 옆 말풍선의 "편지 쓰기"로 다시 열 수 있다) */
  onCancel: () => void;
  /** 저장이 성공하고 썰매가 다 빠져나간 뒤. 창을 닫고 성공 안내를 띄운다 */
  onSaved: () => void;
};

const FORM_ID = "finish-dialog-form";

/** 눈사람을 완성하면 뜨는 창 */
export function FinishDialog(props: Props) {
  // 한 폰을 여러 사람이 돌려 쓸 수 있으니 닉네임은 매번 빈칸에서 새로 쓴다
  const [nickname, setNickname] = useState("");
  const [letter, setLetter] = useState("");
  const [confirmingLeave, setConfirmingLeave] = useState(false);
  /** 보내기 누른 뒤: 저장 중이거나, 저장은 끝났고 썰매가 빠져나가는 중 */
  const [saving, setSaving] = useState(false);
  const [loaderLoading, setLoaderLoading] = useState(true);
  const formRef = useRef<HTMLFormElement>(null);
  const panelHeightRef = useRef(0);
  const [panelMinHeight, setPanelMinHeight] = useState<number | undefined>();
  const saveOkRef = useRef(false);
  const onSavedRef = useRef(props.onSaved);
  const owner = props.mode === "owner";
  const name = nickname.trim();
  const ready = Boolean(name && letter.trim());
  const lockClose = saving;

  useEffect(() => {
    onSavedRef.current = props.onSaved;
  }, [props.onSaved]);

  // 쓰기 화면의 창 높이를 재 두고, 확인 화면·저장 중에도 같은 크기를 유지한다
  useLayoutEffect(() => {
    if (confirmingLeave || saving) return;
    const panel = formRef.current?.closest<HTMLElement>('[role="dialog"]');
    if (!panel) return;
    const measure = () => {
      panelHeightRef.current = panel.offsetHeight;
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(panel);
    return () => ro.disconnect();
  }, [confirmingLeave, saving]);

  const requestClose = () => {
    if (lockClose) return;
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

  const onLoaderFinished = useCallback(() => {
    // 저장 실패로 로더를 내린 뒤에는 성공 경로를 타지 않는다
    if (!saveOkRef.current) return;
    onSavedRef.current();
  }, []);

  // 눈사람 하나 = 편지 한 통. 친구도 주인도 편지를 꼭 쓴다.
  const submit = () => {
    if (!ready || saving) return;
    const panel = formRef.current?.closest<HTMLElement>('[role="dialog"]');
    const height = panel?.offsetHeight || panelHeightRef.current;
    if (height) setPanelMinHeight(height);
    saveOkRef.current = false;
    setLoaderLoading(true);
    setSaving(true);
    void (async () => {
      try {
        await props.onSubmit({ name, letter: letter.trim() });
        saveOkRef.current = true;
        // 저장이 끝나면 로더가 100%를 채우고 썰매가 빠져나간 다음 onSaved를 부른다
        setLoaderLoading(false);
      } catch {
        // 로더를 바로 내리고 입력 화면으로 돌아간다. 실패 안내는 onSubmit 쪽에서 띄운다.
        saveOkRef.current = false;
        setSaving(false);
        setLoaderLoading(true);
      }
    })();
  };

  return (
    <PixelDialog
      title={confirmingLeave ? "눈사람이 녹아 버려요" : "눈사람 완성!"}
      icon={confirmingLeave || saving ? undefined : "star"}
      hideHeader={confirmingLeave}
      hideClose={saving}
      closeOnVeil={!saving}
      onClose={lockClose ? () => {} : confirmingLeave ? keepWriting : requestClose}
      minHeight={confirmingLeave || saving ? panelMinHeight : undefined}
      footer={
        confirmingLeave || saving ? undefined : (
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
      {saving && (
        <div className="flex min-h-full w-full flex-1 flex-col justify-center self-stretch">
          <SantaSleighLoader
            loading={loaderLoading}
            label="산타가 편지를 싣고 있어요"
            doneLabel="배달 준비 완료!"
            onFinished={onLoaderFinished}
          />
        </div>
      )}
      <form
          ref={formRef}
          id={FORM_ID}
          className={`flex flex-col gap-[calc(var(--p)*4)] ${confirmingLeave || saving ? "hidden" : ""}`}
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

"use client";

import { useEffect, useRef, useState } from "react";
import { PixelBadge } from "@/shared/components/PixelBadge";
import { PixelButton } from "@/shared/components/PixelButton";
import { PixelDialog } from "@/shared/components/PixelDialog";
import { PixelIcon } from "@/shared/components/PixelIcon";
import { PixelPanel } from "@/shared/components/PixelPanel";
import { christmasLabel, isLetterOpen } from "../lib/dday";

type Props = {
  /** 편지를 쓴 사람 (닉네임) */
  authorName: string;
  /** 편지를 받는 사람 (마을 주인 닉네임) */
  recipientName: string;
  /** 편지 내용을 서버에서 꺼낸다 (12/25 이후, 마을 주인만 성공한다) */
  onOpen: () => Promise<{ content: string }>;
  onClose: () => void;
  /** 우체통 목록에서 "열기"를 눌러 들어온 경우: 중간 단계 없이 바로 편지를 연다 */
  autoOpen?: boolean;
};

type State = { kind: "sealed" } | { kind: "opening" } | { kind: "opened"; content: string } | { kind: "error"; message: string };

/**
 * 마을 주인이 편지 든 눈사람에서 여는 편지 카드.
 * 12/25 전: 봉인된 봉투 + D-day. 12/25부터: "편지 열기"를 누르면 편지지가 펼쳐진다.
 */
export function LetterCard({ authorName, recipientName, onOpen, onClose, autoOpen = false }: Props) {
  const openable = isLetterOpen();
  const [state, setState] = useState<State>(autoOpen && openable ? { kind: "opening" } : { kind: "sealed" });

  // 바로 열기: 카드가 뜨자마자 한 번만 서버에서 편지를 받아 온다
  const onOpenRef = useRef(onOpen);
  useEffect(() => {
    onOpenRef.current = onOpen;
  });
  useEffect(() => {
    if (!autoOpen || !openable) return;
    let alive = true;
    onOpenRef
      .current()
      .then(({ content }) => alive && setState({ kind: "opened", content }))
      .catch((e: unknown) =>
        alive && setState({ kind: "error", message: e instanceof Error ? e.message : "편지를 열지 못했어요" }),
      );
    return () => {
      alive = false;
    };
  }, [autoOpen, openable]);

  const open = async () => {
    setState({ kind: "opening" });
    try {
      const { content } = await onOpen();
      setState({ kind: "opened", content });
    } catch (e) {
      setState({ kind: "error", message: e instanceof Error ? e.message : "편지를 열지 못했어요" });
    }
  };

  return (
    <PixelDialog title={`${authorName}의 편지`} icon="envelope" align="start" onClose={onClose}>
      {state.kind === "opened" ? (
        <PixelPanel tone="paper" pad={5} className="relative flex flex-col">
          {/* 쓰기 칸과 같은 우표를 편지지 오른쪽 위에 둔다 */}
          <PixelIcon name="stamp" scale={2} className="pointer-events-none absolute right-[calc(var(--p)*3)] top-[calc(var(--p)*3)]" />
          <p className="text-label pr-[calc(var(--p)*14)]" style={{ lineHeight: "24px" }}>
            To. {recipientName}
          </p>
          {/* 줄 그은 편지지: 짧은 편지라도 6줄 높이를 유지한다 */}
          <div className="pixel-paper-lines text-body max-h-[45vh] min-h-[144px] overflow-y-auto whitespace-pre-wrap break-words">
            {state.content}
          </div>
          <p className="text-label self-end" style={{ lineHeight: "24px" }}>
            From. {authorName}
          </p>
        </PixelPanel>
      ) : (
        <PixelPanel tone="paper" pad={6} className="flex flex-col items-center gap-[calc(var(--p)*4)] text-center">
          <PixelIcon name="envelope" scale={5} />
          {!openable ? (
            <>
              <p className="text-body">
                봉인되어 있어요.
                <br />
                12월 25일에 열 수 있어요.
              </p>
              <PixelBadge icon="holly" data-twinkle>
                크리스마스 {christmasLabel()}
              </PixelBadge>
            </>
          ) : (
            <>
              <p className="text-body">메리 크리스마스! 편지를 열어 볼까요?</p>
              {state.kind === "error" && <p className="text-body text-roof">{state.message}</p>}
              <PixelButton variant="primary" className="w-full" disabled={state.kind === "opening"} onClick={open}>
                {state.kind === "opening" ? "여는 중…" : "편지 열기"}
              </PixelButton>
            </>
          )}
        </PixelPanel>
      )}
    </PixelDialog>
  );
}

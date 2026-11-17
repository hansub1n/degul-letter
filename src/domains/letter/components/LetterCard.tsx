"use client";

import { useEffect, useRef, useState } from "react";
import { PixelButton } from "@/shared/components/PixelButton";
import { PixelIcon } from "@/shared/components/PixelIcon";
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

const LINE = 24; // 편지지 한 줄 높이(px)
const PAPER = "#FFFDF6";
const RULE = "#E9E2D0";

/**
 * 마을 주인이 편지 든 눈사람에서 여는 편지 카드.
 * 12/25 전: 봉인된 봉투 + D-day. 12/25부터: "편지 열기"를 누르면 편지지가 펼쳐진다.
 * 닫기는 구석의 작은 ✕ 또는 카드 바깥을 누른다.
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
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#1A173066] px-6" onClick={onClose}>
      <div
        className="pixel-box pixel-box-flat relative w-full max-w-[320px] text-ink"
        style={state.kind === "opened" ? { background: PAPER } : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 버튼 자체에 absolute를 주면 공통 스타일(relative)과 부딪혀서, 감싸는 칸으로 자리를 잡는다 */}
        <div className="absolute right-2 top-2 z-10">
          <PixelButton iconOnly size="sm" icon="close" aria-label="닫기" onClick={onClose} />
        </div>

        {state.kind === "opened" ? (
          <div className="flex flex-col px-5 pb-5 pt-4">
            {/* 빨간 하트 봉인 */}
            <div className="mb-2 flex justify-center">
              <svg aria-hidden width={21} height={18} viewBox="0 0 7 6" shapeRendering="crispEdges" fill="#E0574F">
                <rect x={1} y={0} width={2} height={1} />
                <rect x={4} y={0} width={2} height={1} />
                <rect x={0} y={1} width={7} height={2} />
                <rect x={1} y={3} width={5} height={1} />
                <rect x={2} y={4} width={3} height={1} />
                <rect x={3} y={5} width={1} height={1} />
              </svg>
            </div>
            <p className="text-[12px] font-bold" style={{ lineHeight: `${LINE}px` }}>
              To. {recipientName}
            </p>
            {/* 줄 그은 편지지: 짧은 편지라도 6줄 높이를 유지한다 */}
            <div
              className="max-h-[45vh] overflow-y-auto whitespace-pre-wrap break-words text-[12px]"
              style={{
                lineHeight: `${LINE}px`,
                minHeight: LINE * 6,
                backgroundImage: `repeating-linear-gradient(transparent 0 ${LINE - 1}px, ${RULE} ${LINE - 1}px ${LINE}px)`,
                backgroundAttachment: "local",
              }}
            >
              {state.content}
            </div>
            <p className="self-end text-[12px] font-bold" style={{ lineHeight: `${LINE}px` }}>
              From. {authorName}
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 px-5 pb-7 pt-8">
            <PixelIcon name="letter" scale={5} />
            <p className="text-[12px] font-bold">{authorName}의 편지</p>
            {!openable ? (
              <>
                <p className="text-center text-[12px] leading-[1.7]">
                  봉인되어 있어요.
                  <br />
                  12월 25일에 열 수 있어요.
                </p>
                <p className="text-[24px] font-bold leading-none text-[#E0574F]">{christmasLabel()}</p>
              </>
            ) : (
              <>
                <p className="text-center text-[12px] leading-[1.7]">메리 크리스마스! 편지를 열어 볼까요?</p>
                {state.kind === "error" && <p className="text-center text-[12px] text-[#E0574F]">{state.message}</p>}
                <PixelButton className="mt-1 w-full" disabled={state.kind === "opening"} onClick={open}>
                  {state.kind === "opening" ? "여는 중…" : "편지 열기"}
                </PixelButton>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

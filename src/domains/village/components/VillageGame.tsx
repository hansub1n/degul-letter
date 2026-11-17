"use client";

import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { SculptEditor } from "@/domains/snowman";
import type { SavedSnowman, SnowmanDraft } from "../types";
import { HintPill } from "@/shared/components/HintPill";
import { PixelIcon } from "@/shared/components/PixelIcon";
import { BREAK_HOLD_SECONDS } from "../lib/constants";
import { createVillageGame, type NearbySnowman, type SculptSeed, type VillageGame as Game } from "../lib/engine";
import type { GameEvent } from "../lib/types";

const BREAK_HOLD_MS = BREAK_HOLD_SECONDS * 1000;

function messageFor(event: GameEvent): string | null {
  switch (event.type) {
    case "pushHint":
      return "계속 밀면 위로 올라가요";
    case "stackBlocked":
      return event.reason === "full" ? "4단까지만 쌓을 수 있어요" : "완성된 눈사람에는 더 쌓을 수 없어요";
    case "stacked":
      return event.height === 2 ? "눈사람이 됐어요! 더 쌓거나 완성해 보세요" : `${event.height}단 눈사람!`;
    case "broken":
      return "와르르!";
    // 완성은 눈사람이 직접 방방 뛰며 "완성!"을 보여 주니 알림을 따로 띄우지 않는다
    default:
      return null;
  }
}

type Props = {
  /** 마을에 이미 저장된 눈사람들 (처음 한 번만 읽는다) */
  saved?: readonly SavedSnowman[];
  myId?: string | null;
  /** 마을 주인이면 true: 편지가 든 눈사람에 다가가면 편지 버튼이 뜬다 */
  isOwner?: boolean;
  /** 눈사람을 완성했을 때. 저장이 끝나면 markSaved로 저장 ID와 이름, 편지 여부를 알려 준다 */
  onSnowmanFinished?: (draft: SnowmanDraft, markSaved: MarkSaved) => void;
  /** 저장된 내 눈사람을 부쉈을 때 */
  onSavedSnowmanBroken?: (savedId: string) => void;
  /** 편지 버튼을 눌렀을 때 (어느 눈사람의 편지인지) */
  onOpenLetter?: (snowman: NearbySnowman) => void;
  /** 우체통 말풍선의 편지 버튼을 눌렀을 때 (마을 주인만) */
  onOpenMailbox?: () => void;
  /** 우체통에 모인 편지 수 (깃발이 올라간다) */
  mailCount?: number;
  /** 화면 위쪽에 띄울 것 (링크 보내기 등) */
  header?: ReactNode;
  /** 화면 위에 덮어 띄울 것 (입장 타이틀 등). 조작을 막지 않는다 */
  overlay?: ReactNode;
};

export type MarkSaved = (rowId: string, authorName: string, hasLetter: boolean) => void;

export function VillageGame({
  saved = [],
  myId = null,
  isOwner = false,
  onSnowmanFinished,
  onSavedSnowmanBroken,
  onOpenLetter,
  onOpenMailbox,
  mailCount = 0,
  header,
  overlay,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const [toast, setToast] = useState<{ text: string; key: number } | null>(null);
  const [nearby, setNearby] = useState<NearbySnowman | null>(null);
  const [mailboxNear, setMailboxNear] = useState(false);
  const [showHint, setShowHint] = useState(true);
  const [sculpting, setSculpting] = useState<SculptSeed | null>(null);

  // 게임은 처음 한 번만 만드니, 바뀔 수 있는 값은 ref로 최신 값을 들고 있는다
  const initial = useRef({ saved, myId, isOwner });
  const callbacks = useRef({ onSnowmanFinished, onSavedSnowmanBroken });
  useEffect(() => {
    callbacks.current = { onSnowmanFinished, onSavedSnowmanBroken };
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const game = createVillageGame({
      canvas,
      saved: initial.current.saved,
      myId: initial.current.myId,
      isOwner: initial.current.isOwner,
      onEvent: (event) => {
        const text = messageFor(event);
        if (text) setToast({ text, key: performance.now() });
        if (event.type === "finished") {
          const draft = game.exportSnowman(event.stackId);
          if (draft) {
            callbacks.current.onSnowmanFinished?.(draft, (rowId, name, hasLetter) =>
              game.markSaved(event.stackId, rowId, name, hasLetter),
            );
          }
        }
        if (event.type === "broken" && event.savedId) callbacks.current.onSavedSnowmanBroken?.(event.savedId);
      },
      onNearbyChange: setNearby,
      onMailboxNearChange: setMailboxNear,
    });
    gameRef.current = game;
    const hintTimer = window.setTimeout(() => setShowHint(false), 8000);
    return () => {
      window.clearTimeout(hintTimer);
      game.destroy();
      gameRef.current = null;
    };
  }, []);

  useEffect(() => {
    gameRef.current?.setMailCount(mailCount);
  }, [mailCount]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 1800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  return (
    <div className="relative h-full w-full select-none overflow-hidden">
      <canvas
        ref={canvasRef}
        aria-label="눈사람 마을"
        className="block h-full w-full touch-none [image-rendering:pixelated]"
      />

      {header && !sculpting && <div className="absolute inset-x-3 top-3">{header}</div>}
      {overlay}

      {/* 조작 안내: 마을 이름보다 눈에 띄지 않게 아래쪽에 한 줄로, 몇 초 뒤 사라진다 */}
      <HintPill
        className={`absolute bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap transition-opacity duration-700 ${
          showHint && !sculpting ? "opacity-100" : "opacity-0"
        }`}
      >
        끌어서 걷고, 눈덩이를 밀어 굴려요
      </HintPill>

      {/* 알림: 위쪽 가운데 */}
      <HintPill
        role="status"
        className={`absolute left-1/2 top-[72px] -translate-x-1/2 whitespace-nowrap transition-opacity duration-300 ${
          toast ? "opacity-100" : "opacity-0"
        }`}
      >
        {toast?.text}
      </HintPill>

      {sculpting && (
        <SculptEditor
          initial={sculpting.sculpt}
          toCell={(x, y) => gameRef.current?.sculptCellAt(x, y) ?? null}
          onChange={(sculpt) => gameRef.current?.updateSculpt(sculpt)}
          onDone={(sculpt) => {
            gameRef.current?.finishSculpt(sculpting.stackId, sculpt);
            setSculpting(null);
          }}
          onCancel={() => {
            gameRef.current?.cancelSculpt();
            setSculpting(null);
          }}
        />
      )}

      {(nearby || mailboxNear) && !sculpting && (
        // 눈사람 머리 위에 뜨는 말풍선. 위치는 엔진이 매 프레임 직접 옮긴다(setNearbyAnchor).
        <div ref={(el) => gameRef.current?.setNearbyAnchor(el)} className="absolute left-0 top-0 opacity-0">
          <div className="pixel-bob flex flex-col items-center">
            <div className="pixel-box pixel-box-flat flex items-stretch">
              {!nearby && (
                // 우체통 말풍선: 모든 편지 보기
                <BubbleButton label="우체통 열기" onClick={() => onOpenMailbox?.()}>
                  <PixelIcon name="letter" />
                </BubbleButton>
              )}
              {nearby && bubbleButtons(nearby, isOwner).map((kind, i) => (
                <Fragment key={kind}>
                  {i > 0 && <span aria-hidden className="my-2 w-[3px] bg-[#DCE5F2]" />}
                  {kind === "carve" && (
                    <BubbleButton
                      label="조각해서 완성하기"
                      onClick={() => setSculpting(gameRef.current?.startSculpt() ?? null)}
                    >
                      <PixelIcon name="carve" />
                    </BubbleButton>
                  )}
                  {kind === "letter" && (
                    <BubbleButton label="편지 보기" onClick={() => onOpenLetter?.(nearby)}>
                      <PixelIcon name="letter" />
                    </BubbleButton>
                  )}
                  {kind === "hammer" && (
                    <BreakButton
                      onHoldChange={(holding) => gameRef.current?.setBreakCharging(holding)}
                      onBreak={() => gameRef.current?.breakNearby()}
                      onTooShort={() => setToast({ text: "망치를 꾹 눌러야 부서져요", key: performance.now() })}
                    />
                  )}
                </Fragment>
              ))}
            </div>
            <BubbleTail />
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * 말풍선에 띄울 버튼:
 * - 조각 전인 내 눈사람: 끌, 망치
 * - 완성한 내 눈사람: 망치 (주인이 자기 마을에 세운 것엔 편지가 없다)
 * - 남의 눈사람(마을 주인에게만 보임): 편지
 */
function bubbleButtons(snowman: NearbySnowman, isOwner: boolean): Array<"carve" | "letter" | "hammer"> {
  if (!snowman.mine) return isOwner && snowman.hasLetter ? ["letter"] : [];
  const buttons: Array<"carve" | "letter" | "hammer"> = [];
  if (!snowman.finished) buttons.push("carve");
  if (isOwner && snowman.hasLetter) buttons.push("letter");
  buttons.push("hammer");
  return buttons;
}

/** 말풍선 안의 아이콘 칸. 버튼 테두리 없이, 누르면 한 칸 들어가고 하늘색으로 바뀐다. */
function BubbleButton({ label, className = "", children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`relative flex h-12 w-12 items-center justify-center overflow-hidden active:translate-y-[3px] active:bg-[#DCE5F2] ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

/** 말풍선 꼬리: 테두리와 이어지도록 위 한 줄을 말풍선 테두리에 겹친다. 흰 속, 남색 테두리. */
function BubbleTail() {
  const rows = ["owwwwo", ".owwo.", "..oo.."];
  return (
    <svg aria-hidden width={18} height={9} viewBox="0 0 6 3" shapeRendering="crispEdges" className="-mt-[3px]">
      {rows.flatMap((row, y) =>
        [...row].map((c, x) =>
          c === "." ? null : <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={c === "o" ? "#2A2350" : "#FFFFFF"} />,
        ),
      )}
    </svg>
  );
}

/** 꾹 눌러야 부서지는 버튼. 실수로 부수지 않게 한다. 너무 짧게 떼면 onTooShort로 알려 준다. */
function BreakButton({
  onBreak,
  onHoldChange,
  onTooShort,
}: {
  onBreak: () => void;
  onHoldChange: (holding: boolean) => void;
  onTooShort: () => void;
}) {
  const [holding, setHolding] = useState(false);
  const timerRef = useRef<number | null>(null);

  const cancel = (released: boolean) => {
    if (timerRef.current === null) return;
    window.clearTimeout(timerRef.current);
    timerRef.current = null;
    setHolding(false);
    onHoldChange(false);
    if (released) onTooShort();
  };
  const start = () => {
    cancel(false);
    setHolding(true);
    onHoldChange(true);
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      setHolding(false);
      onBreak();
    }, BREAK_HOLD_MS);
  };

  // 버튼이 사라질 때(눈사람에서 멀어질 때) 누르던 중이면 취소
  const cancelRef = useRef(cancel);
  useEffect(() => {
    cancelRef.current = cancel;
  });
  useEffect(() => () => cancelRef.current(false), []);

  return (
    <BubbleButton
      label="꾹 눌러 부수기"
      onPointerDown={start}
      onPointerUp={() => cancel(true)}
      onPointerLeave={() => cancel(false)}
      onPointerCancel={() => cancel(false)}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* 누르는 동안 아래에서 위로 차오르는 게이지 */}
      <span
        aria-hidden
        className="absolute inset-x-0 bottom-0 bg-[#FFD3D0]"
        style={{ height: holding ? "100%" : "0%", transition: holding ? `height ${BREAK_HOLD_MS}ms linear` : "none" }}
      />
      <PixelIcon name="hammer" className="relative" />
    </BubbleButton>
  );
}

"use client";

import { Fragment, useEffect, useRef, useState, type MutableRefObject, type ReactNode } from "react";
import { isModalLocked, onModalLockChange } from "@/shared/lib/modalLock";
import { SculptEditor } from "@/domains/snowman";
import type { SavedSnowman, SnowmanDraft } from "../types";
import { PixelButton } from "@/shared/components/PixelButton";
import type { PixelIconName } from "@/shared/components/PixelIcon";
import { PixelIcon } from "@/shared/components/PixelIcon";
import { PixelToast } from "@/shared/components/PixelToast";
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
    case "overlapping":
      return "다른 눈사람과 겹쳐요";
    case "zoneBlocked":
      return "다른 눈사람과 너무 가까워요. 조금 떨어져서 쌓아 주세요";
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
  onSnowmanFinished?: (stackId: number, draft: SnowmanDraft, markSaved: MarkSaved) => void;
  /** 완성했지만 편지 창을 취소해서 아직 저장하지 않은 눈사람들. 다가가면 "편지 쓰기"가 뜬다 */
  unsentIds?: readonly number[];
  /** 말풍선의 "편지 쓰기"를 눌렀을 때 */
  onWriteLetter?: (stackId: number) => void;
  /** 저장된 내 눈사람을 부쉈을 때 */
  onSavedSnowmanBroken?: (savedId: string) => void;
  /** 어떤 눈사람이든 부서졌을 때 (편지를 안 넣은 눈사람 목록에서 빼려고 쓴다) */
  onSnowmanBroken?: (stackId: number) => void;
  /** 편지 버튼을 눌렀을 때 (어느 눈사람의 편지인지) */
  onOpenLetter?: (snowman: NearbySnowman) => void;
  /** 우체통 말풍선을 눌렀을 때 (주인: 우체통 열기, 방문자: 언제 열리는지 안내). 없으면 말풍선을 띄우지 않는다 */
  onOpenMailbox?: () => void;
  /** 집 문 앞 말풍선 (주인: 로그아웃, 방문자: 첫 화면으로). 없으면 말풍선을 띄우지 않는다 */
  door?: { icon: PixelIconName; label: string; onClick: () => void };
  /** 우체통에 모인 편지 수 (깃발이 올라간다) */
  mailCount?: number;
  /** 화면 위쪽에 띄울 것 (링크 보내기 등) */
  header?: ReactNode;
  /** 화면 위에 덮어 띄울 것 (입장 타이틀 등). 조작을 막지 않는다 */
  overlay?: ReactNode;
  /** 저장 전 눈사람 작업이 있는지 확인할 손잡이 */
  apiRef?: MutableRefObject<VillageGameApi | null>;
};

export type VillageGameApi = {
  hasUnsavedWork: () => boolean;
};

export type MarkSaved = (rowId: string, authorName: string, hasLetter: boolean) => void;

export function VillageGame({
  saved = [],
  myId = null,
  isOwner = false,
  onSnowmanFinished,
  unsentIds = [],
  onWriteLetter,
  onSavedSnowmanBroken,
  onSnowmanBroken,
  onOpenLetter,
  onOpenMailbox,
  door,
  mailCount = 0,
  header,
  overlay,
  apiRef,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Game | null>(null);
  const headerRef = useRef<HTMLDivElement | null>(null);
  const [toast, setToast] = useState<{ text: string; key: number; side: "top" | "bottom" } | null>(null);
  /** 알림은 캐릭터 반대쪽 절반에 띄운다. 말풍선(망치·끌·우체통)은 늘 캐릭터 근처라 겹치지 않는다 */
  const showToast = (text: string) =>
    setToast({ text, key: performance.now(), side: gameRef.current?.playerInLowerHalf() ? "top" : "bottom" });
  const [nearby, setNearby] = useState<NearbySnowman | null>(null);
  const [mailboxNear, setMailboxNear] = useState(false);
  const [doorNear, setDoorNear] = useState(false);
  const [showHint, setShowHint] = useState(true);
  const [sculpting, setSculpting] = useState<SculptSeed | null>(null);

  // 바뀔 수 있는 콜백은 ref로 최신 값을 들고 있는다 (게임 루프가 매 프레임 부르므로)
  const callbacks = useRef({ onSnowmanFinished, onSavedSnowmanBroken, onSnowmanBroken });
  useEffect(() => {
    callbacks.current = { onSnowmanFinished, onSavedSnowmanBroken, onSnowmanBroken };
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const game = createVillageGame({
      canvas,
      saved,
      myId,
      isOwner,
      onEvent: (event) => {
        const text = messageFor(event);
        if (text) showToast(text);
        if (event.type === "finished") {
          const draft = game.exportSnowman(event.stackId);
          if (draft) {
            callbacks.current.onSnowmanFinished?.(event.stackId, draft, (rowId, name, hasLetter) =>
              game.markSaved(event.stackId, rowId, name, hasLetter),
            );
          }
        }
        if (event.type === "broken") {
          callbacks.current.onSnowmanBroken?.(event.stackId);
          if (event.savedId) callbacks.current.onSavedSnowmanBroken?.(event.savedId);
        }
      },
      onNearbyChange: setNearby,
      onMailboxNearChange: setMailboxNear,
      onDoorNearChange: setDoorNear,
    });
    gameRef.current = game;
    // 표지판 층은 게임보다 먼저 그려지므로, 게임을 만든 뒤 한 번 더 알려 준다
    game.setHeaderLayer(headerRef.current);
    const hintTimer = window.setTimeout(() => setShowHint(false), 8000);
    return () => {
      window.clearTimeout(hintTimer);
      game.destroy();
      gameRef.current = null;
    };
  }, [saved, myId, isOwner]);

  useEffect(() => {
    gameRef.current?.setMailCount(mailCount);
  }, [mailCount]);

  useEffect(() => {
    gameRef.current?.setUnsentIds(unsentIds);
  }, [unsentIds]);

  useEffect(() => {
    if (!apiRef) return;
    apiRef.current = {
      hasUnsavedWork: () => Boolean(sculpting) || Boolean(gameRef.current?.hasUnsavedWork()),
    };
    return () => {
      apiRef.current = null;
    };
  }, [apiRef, sculpting]);

  // 모달이 열려 있으면 헤더·말풍선·캔버스까지 뒤 레이어를 통째로 막는다 (베일 뒤로 클릭이 새지 않게)
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const apply = (locked: boolean) => {
      el.toggleAttribute("inert", locked);
    };
    apply(isModalLocked());
    return onModalLockChange(apply);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 1800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  return (
    <div ref={rootRef} className="relative h-full w-full select-none overflow-hidden">
      <canvas
        ref={canvasRef}
        aria-label="눈사람 마을"
        className="block h-full w-full touch-none [image-rendering:pixelated]"
      />

      {/* 편지 안 넣은 눈사람 머리 위 봉투. 위치는 엔진이 매 프레임 옮긴다. 다가가 "편지 쓰기"가 뜨면 숨긴다. */}
      {unsentIds.length > 0 && (
        <div
          ref={(el) => gameRef.current?.setUnsentMarkerLayer(el)}
          className="pointer-events-none absolute inset-0"
          aria-hidden
        >
          {unsentIds.map((id) => (
            <div key={id} data-unsent-id={id} className="absolute left-0 top-0 flex leading-none opacity-0">
              <span className="pixel-blink block leading-none">
                <PixelIcon name="envelope" scale={2} />
              </span>
            </div>
          ))}
        </div>
      )}

      {header && !sculpting && (
        <div
          ref={(el) => {
            headerRef.current = el;
            gameRef.current?.setHeaderLayer(el);
          }}
          className="absolute"
          style={{
            top: "calc(12px + env(safe-area-inset-top, 0px))",
            left: "max(12px, env(safe-area-inset-left, 0px))",
            right: "max(12px, env(safe-area-inset-right, 0px))",
          }}
        >
          {header}
        </div>
      )}
      {overlay}

      {/* 조작 안내: 마을 이름보다 눈에 띄지 않게 아래쪽에 한 줄로, 몇 초 뒤 사라진다 */}
      {showHint && !sculpting && <PixelToast icon="arrow">끌어서 걷고, 눈덩이를 밀어 굴려요</PixelToast>}

      {/* 알림: 캐릭터가 화면 아래쪽에 있으면 위(마을 이름 표지판 아래), 위쪽에 있으면 아래에 띄운다 */}
      {toast && (
        <div
          className="pointer-events-none absolute inset-x-0 flex justify-center px-[calc(var(--p)*4)]"
          style={
            toast.side === "top"
              ? { top: "calc(96px + env(safe-area-inset-top, 0px))" }
              : { bottom: "calc(96px + env(safe-area-inset-bottom, 0px))" }
          }
        >
          <PixelToast key={toast.key} placement="inline">
            {toast.text}
          </PixelToast>
        </div>
      )}

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

      {(nearby || (mailboxNear && onOpenMailbox) || (doorNear && door)) && !sculpting && (
        // 눈사람 머리 위에 뜨는 말풍선. 위치는 엔진이 매 프레임 직접 옮긴다(setNearbyAnchor).
        <div ref={(el) => gameRef.current?.setNearbyAnchor(el)} className="absolute left-0 top-0 opacity-0">
          <div className="pixel-bob flex items-end gap-[calc(var(--p)*3)] pb-[calc(var(--p)*2)]">
            {!nearby && mailboxNear && onOpenMailbox && (
              <PixelButton iconOnly size="sm" icon="mailbox" aria-label="우체통" onClick={onOpenMailbox} />
            )}
            {!nearby && doorNear && door && (
              // 집 말풍선 (지붕 위). 아이콘만 두고, 누르면 확인 창이나 이동으로 뜻을 알려 준다
              <PixelButton iconOnly size="sm" icon={door.icon} aria-label={door.label} onClick={door.onClick} />
            )}
            {nearby &&
              bubbleButtons(nearby, isOwner, unsentIds.includes(nearby.id)).map((kind) => (
                <Fragment key={kind}>
                  {kind === "write" && (
                    <PixelButton
                      variant="primary"
                      size="sm"
                      icon="envelope"
                      onClick={() => onWriteLetter?.(nearby.id)}
                    >
                      편지 쓰기
                    </PixelButton>
                  )}
                  {kind === "carve" && (
                    <PixelButton
                      iconOnly
                      size="sm"
                      icon="carve"
                      aria-label="조각해서 완성하기"
                      onClick={() => setSculpting(gameRef.current?.startSculpt() ?? null)}
                    />
                  )}
                  {kind === "letter" && (
                    <PixelButton iconOnly size="sm" icon="envelope" aria-label="편지 보기" onClick={() => onOpenLetter?.(nearby)} />
                  )}
                  {kind === "hammer" && (
                    <BreakButton
                      onHoldChange={(holding) => {
                        gameRef.current?.setBreakCharging(holding);
                        // 편지를 넣은 내 눈사람: 망치질은 그대로 두고, 내리치는 동안 편지도 사라진다고만 알려 준다
                        if (holding && nearby.savedId && nearby.hasLetter) {
                          showToast("부수면 넣은 편지도 같이 사라져요");
                        }
                      }}
                      onBreak={() => gameRef.current?.breakNearby()}
                      onTooShort={() => showToast("망치를 꾹 눌러야 부서져요")}
                    />
                  )}
                </Fragment>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * 말풍선에 띄울 버튼:
 * - 조각 전인 내 눈사람: 끌, 망치
 * - 완성했지만 편지를 아직 안 넣은 내 눈사람: 편지 쓰기, 망치
 * - 완성한 내 눈사람: 망치 (주인이 자기 마을에 세운 것엔 편지가 없다)
 * - 남의 눈사람(마을 주인에게만 보임): 편지
 */
function bubbleButtons(
  snowman: NearbySnowman,
  isOwner: boolean,
  unsent: boolean,
): Array<"write" | "carve" | "letter" | "hammer"> {
  if (!snowman.mine) return isOwner && snowman.hasLetter ? ["letter"] : [];
  const buttons: Array<"write" | "carve" | "letter" | "hammer"> = [];
  // 완성했지만 편지 창을 취소한 눈사람: 다시 편지를 쓸 수 있다
  if (snowman.finished && !snowman.savedId && unsent) buttons.push("write");
  if (!snowman.finished) buttons.push("carve");
  if (isOwner && snowman.hasLetter) buttons.push("letter");
  buttons.push("hammer");
  return buttons;
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
    <PixelButton
      iconOnly
      size="sm"
      icon="hammer"
      aria-label="꾹 눌러 부수기"
      className="overflow-hidden"
      onPointerDown={start}
      onPointerUp={() => cancel(true)}
      onPointerLeave={() => cancel(false)}
      onPointerCancel={() => cancel(false)}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* 누르는 동안 아래에서 위로 차오르는 게이지: 바탕 --snow-shade, 채움 --roof */}
      {holding && <span aria-hidden className="absolute inset-0 bg-snow-shade" />}
      <span
        aria-hidden
        className="absolute inset-x-0 bottom-0 bg-roof"
        style={{ height: holding ? "100%" : "0%", transition: holding ? `height ${BREAK_HOLD_MS}ms steps(8, end)` : "none" }}
      />
    </PixelButton>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { hasSeenSculptGuide, SculptToolGuide } from "./SculptToolGuide";
import { PixelButton } from "@/shared/components/PixelButton";
import type { PixelIconName } from "@/shared/components/PixelIcon";
import { PixelToast } from "@/shared/components/PixelToast";
import { cloneSculpt, strokeLine, type Sculpt, type SculptTool } from "../lib/sculpt";

type Props = {
  initial: Sculpt;
  /** 화면 좌표가 조각의 몇 번째 칸인지 (그림은 마을 화면이 그리니, 위치 계산도 마을 쪽에 묻는다) */
  toCell: (clientX: number, clientY: number) => { x: number; y: number } | null;
  /** 모양이 바뀔 때마다 마을 화면에 알려서 바로 다시 그리게 한다 */
  onChange: (sculpt: Sculpt) => void;
  onDone: (sculpt: Sculpt) => void;
  onCancel: () => void;
};

const TOOLS: Array<{ id: SculptTool; label: string; hint: string; icon: PixelIconName }> = [
  { id: "carve", label: "깎기", hint: "깎기: 눈을 파내서 모양을 다듬어요", icon: "carve" },
  { id: "add", label: "붙이기", hint: "붙이기: 눈에 이어서 덧붙여요", icon: "add" },
  { id: "press", label: "누르기", hint: "누르기: 꾹 눌러 움푹하게 (눈, 입)", icon: "press" },
  { id: "smooth", label: "문지르기", hint: "문지르기: 이음새를 매끈하게", icon: "smooth" },
];

const MAX_UNDO = 40;

/**
 * 조각 도구 화면. 그림은 따로 그리지 않고 마을 화면이 눈사람 쪽으로 확대된 모습을 그대로 쓴다.
 * 이 컴포넌트는 투명한 판으로 손가락을 받아 칸을 고치고, 버튼만 띄운다.
 */
export function SculptEditor({ initial, toCell, onChange, onDone, onCancel }: Props) {
  const sculptRef = useRef<Sculpt>(cloneSculpt(initial));
  const undoRef = useRef<Uint8Array[]>([]);
  const strokeRef = useRef<{ pointerId: number; x: number; y: number; snapshot: Uint8Array; changed: boolean } | null>(
    null,
  );

  const [tool, setTool] = useState<SculptTool>("carve");
  const [size, setSize] = useState<1 | 3>(1);
  const [canUndo, setCanUndo] = useState(false);
  /** 처음 조각하는 사람에게 도구 미리보기 카드를 띄운다 (이 브라우저에서 한 번) */
  const [guideOpen, setGuideOpen] = useState(false);
  useEffect(() => {
    // 저장소는 브라우저에서만 읽을 수 있어서 한 박자 뒤에 정한다
    const id = window.setTimeout(() => setGuideOpen(!hasSeenSculptGuide()), 0);
    return () => window.clearTimeout(id);
  }, []);

  const publish = () => onChange(sculptRef.current);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (strokeRef.current) return;
    const cell = toCell(e.clientX, e.clientY);
    if (!cell) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const s = sculptRef.current;
    const snapshot = s.cells.slice();
    const changed = strokeLine(s, cell.x, cell.y, cell.x, cell.y, tool, size);
    strokeRef.current = { pointerId: e.pointerId, x: cell.x, y: cell.y, snapshot, changed };
    if (changed) publish();
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const stroke = strokeRef.current;
    if (!stroke || stroke.pointerId !== e.pointerId) return;
    const cell = toCell(e.clientX, e.clientY);
    if (!cell || (cell.x === stroke.x && cell.y === stroke.y)) return;
    if (strokeLine(sculptRef.current, stroke.x, stroke.y, cell.x, cell.y, tool, size)) {
      stroke.changed = true;
      publish();
    }
    stroke.x = cell.x;
    stroke.y = cell.y;
  };

  const onPointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    const stroke = strokeRef.current;
    if (!stroke || stroke.pointerId !== e.pointerId) return;
    strokeRef.current = null;
    if (!stroke.changed) return;
    // 한 번 긋기 전 모습을 되돌리기 목록에 쌓는다
    undoRef.current.push(stroke.snapshot);
    if (undoRef.current.length > MAX_UNDO) undoRef.current.shift();
    setCanUndo(true);
  };

  const undo = () => {
    const previous = undoRef.current.pop();
    if (!previous) return;
    sculptRef.current.cells.set(previous);
    setCanUndo(undoRef.current.length > 0);
    publish();
  };

  const active = TOOLS.find((t) => t.id === tool);

  return (
    <>
      {/* 창이 열리면 마을 화면 전체가 inert(조작 불가)가 되므로, 카드는 마을 화면 밖(body)에 띄운다 */}
      {guideOpen && createPortal(<SculptToolGuide onClose={() => setGuideOpen(false)} />, document.body)}
      <div className="fixed inset-0 z-20 select-none">
      {/* 손가락을 받는 투명한 판 */}
      <div
        className="absolute inset-0 touch-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
      />

      {/* 아이폰 노치·홈 바(viewport-fit=cover)를 피해 안전 영역만큼 더 띄운다 */}
      <div style={{ top: "calc(var(--p) * 4 + env(safe-area-inset-top, 0px))" }} className="pointer-events-none absolute inset-x-[calc(var(--p)*4)] flex items-start justify-between gap-[calc(var(--p)*4)]">
        <PixelButton iconOnly icon="close" aria-label="나가기" className="pointer-events-auto" onClick={onCancel} />
        {/* 안내 칸은 고정 크기로 둔다. 도구마다 글 길이가 달라 칸이 줄어들면
            아이폰 사파리가 예전 칸 테두리를 지우지 않고 자국으로 남긴다 */}
        <div className="mt-[var(--p)] min-w-0 flex-1">
          {/* 칸은 다시 만들지 않는다: 바꿀 때마다 아래에서 올라오면 뒤에 카드가 겹친 것처럼 보였다.
              도구가 바뀐 건 글자만 살짝 깜빡여서 알린다. 폭은 고정(최대 360px) */}
          <PixelToast placement="inline" className="w-[min(360px,100%)]">
            <span key={tool} className="pixel-flash">
              {active?.hint}
            </span>
          </PixelToast>
        </div>
        <PixelButton
          variant="pine"
          iconOnly
          icon="check"
          aria-label="완료"
          className="pointer-events-auto"
          onClick={() => onDone(cloneSculpt(sculptRef.current))}
        />
      </div>

      <div style={{ bottom: "calc(var(--p) * 6 + env(safe-area-inset-bottom, 0px))" }} className="pointer-events-none absolute inset-x-[calc(var(--p)*4)] flex justify-center gap-[calc(var(--p)*4)]">
        {TOOLS.map((t) => (
          <PixelButton
            iconOnly
            key={t.id}
            icon={t.icon}
            aria-label={t.label}
            active={tool === t.id}
            className="pointer-events-auto"
            onClick={() => setTool(t.id)}
          />
        ))}
        <span aria-hidden className="w-[calc(var(--p)*2)]" />
        <PixelButton
          iconOnly
          icon={size === 1 ? "brushSmall" : "brushLarge"}
          aria-label={size === 1 ? "붓 크기: 작게" : "붓 크기: 크게"}
          className="pointer-events-auto"
          onClick={() => setSize(size === 1 ? 3 : 1)}
        />
        <PixelButton iconOnly icon="undo" aria-label="되돌리기" className="pointer-events-auto" onClick={undo} disabled={!canUndo} />
      </div>
      </div>
    </>
  );
}

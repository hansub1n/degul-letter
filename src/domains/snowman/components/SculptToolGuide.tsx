"use client";

import { useEffect, useRef } from "react";
import { PixelButton } from "@/shared/components/PixelButton";
import { PixelDialog } from "@/shared/components/PixelDialog";
import { PixelIcon, type PixelIconName } from "@/shared/components/PixelIcon";
import { applyBrush, cloneSculpt, drawSculpt, sculptContentTop, sculptFromBalls, SEAM, strokeLine, type Sculpt } from "../lib/sculpt";
import type { SculptTool } from "../types";

/** 이 브라우저에서 도구 미리보기를 봤는지 (편의용이라 저장이 안 돼도 화면은 그대로 동작) */
const SEEN_KEY = "degul-sculpt-guide-seen";
/** 미리보기 칸 한 칸의 화면 크기(px) */
const CELL = 3;
/** 쓰기 전 ↔ 쓴 뒤를 바꾸는 간격 */
const FLIP_MS = 1100;

export function hasSeenSculptGuide(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

function markSeen(): void {
  try {
    localStorage.setItem(SEEN_KEY, "1");
  } catch {
    // 저장소를 못 쓰면 다음에 다시 보여 줄 뿐이다
  }
}

/** 미리보기용 2단 눈사람 (아래 반지름 9, 위 6) */
function baseSculpt(): { s: Sculpt; headX: number; headY: number; seamY: number } {
  const r0 = 9;
  const r1 = 6;
  const heights = [r0, r0 + (r0 + r1) * 0.8];
  const s = sculptFromBalls([{ r: r0 }, { r: r1 }], heights);
  const headY = s.height - 1 - Math.round(heights[1]);
  let seamY = headY;
  for (let y = 0; y < s.height; y++) if (s.cells.slice(y * s.width, (y + 1) * s.width).includes(SEAM)) seamY = y;
  return { s, headX: s.originX, headY, seamY };
}

/** 도구마다 쓴 뒤 모습을 만든다 (실제 조각 도구와 같은 함수로 칸을 고친다) */
function afterTool(tool: SculptTool): { before: Sculpt; after: Sculpt } {
  const { s, headX, headY, seamY } = baseSculpt();
  const after = cloneSculpt(s);
  if (tool === "carve") strokeLine(after, headX + 4, headY - 5, headX + 6, headY + 3, "carve", 3);
  if (tool === "add") strokeLine(after, headX + 6, headY, headX + 10, headY, "add", 1);
  if (tool === "press") {
    applyBrush(after, headX - 2, headY - 1, "press", 1);
    applyBrush(after, headX + 2, headY - 1, "press", 1);
    strokeLine(after, headX - 1, headY + 2, headX + 1, headY + 2, "press", 1);
  }
  if (tool === "smooth") strokeLine(after, 0, seamY, s.width - 1, seamY, "smooth", 3);
  return { before: s, after };
}

function ToolPreview({ tool }: { tool: SculptTool }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const { before, after } = afterTool(tool);
    let showAfter = true;
    // 조각 틀 위쪽 빈 여백은 잘라서 그린다
    const top = sculptContentTop(before) - 1;
    const paint = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawSculpt(ctx, showAfter ? after : before, 0, -top * CELL, CELL);
    };
    paint();
    // 움직임 줄이기 설정이면 쓴 뒤 모습만 보여 준다
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => {
      showAfter = !showAfter;
      paint();
    }, FLIP_MS);
    return () => window.clearInterval(id);
  }, [tool]);
  const { before } = afterTool(tool);
  const rows = before.height - (sculptContentTop(before) - 1);
  return <canvas ref={ref} width={before.width * CELL} height={rows * CELL} aria-hidden className="block" />;
}

const TOOLS: ReadonlyArray<{ tool: SculptTool; icon: PixelIconName; name: string; text: string }> = [
  { tool: "carve", icon: "carve", name: "깎기", text: "눈을 파내서\n모양을 다듬어요" },
  { tool: "add", icon: "add", name: "붙이기", text: "눈 옆에 이어서\n덧붙여요" },
  { tool: "press", icon: "press", name: "누르기", text: "꾹 눌러 움푹하게\n눈·입을 만들어요" },
  { tool: "smooth", icon: "smooth", name: "문지르기", text: "쌓은 이음새를\n매끈하게 해요" },
];

/** 조각 화면에 처음 들어오면 도구 4개를 쓰기 전·쓴 뒤 모습으로 번갈아 보여 주는 카드 */
export function SculptToolGuide({ onClose }: { onClose: () => void }) {
  const close = () => {
    markSeen();
    onClose();
  };
  return (
    <PixelDialog title="조각 도구" onClose={close}>
      <div className="flex flex-col gap-[calc(var(--p)*4)] pt-[calc(var(--p)*2)]">
        <div className="grid grid-cols-2 gap-[calc(var(--p)*3)]">
          {TOOLS.map(({ tool, icon, name, text }) => (
            <div key={tool} className="pixel-box pixel-box-flat flex flex-col items-center gap-[calc(var(--p)*2)] p-[calc(var(--p)*3)]">
              <div className="flex items-end justify-center">
                <ToolPreview tool={tool} />
              </div>
              <p className="text-label flex items-center gap-[calc(var(--p)*2)]">
                <PixelIcon name={icon} scale={2} />
                {name}
              </p>
              <p className="text-caption text-muted whitespace-pre-line text-center leading-[1.5]">{text}</p>
            </div>
          ))}
        </div>
        <PixelButton variant="primary" className="w-full" onClick={close}>
          조각 시작하기
        </PixelButton>
      </div>
    </PixelDialog>
  );
}

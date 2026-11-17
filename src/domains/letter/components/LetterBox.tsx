"use client";

import { useState } from "react";
import { PixelButton } from "@/shared/components/PixelButton";
import { PixelIcon } from "@/shared/components/PixelIcon";
import { christmasLabel, isLetterOpen } from "../lib/dday";
import { EnvelopeArt } from "./EnvelopeArt";
import { LetterCard } from "./LetterCard";

export type LetterSummary = { letterId: string; authorName: string };

/** 한 페이지에 보이는 봉투 수 (4개씩 2줄). 봉투 칸은 편지가 적어도 이 크기를 유지한다. */
const COLS = 4;
const PAGE_SIZE = 8;
const CELL_H = 74; // 봉투 + 이름 한 칸 높이(px)
const ROW_GAP = 10;

const READ_KEY = "degul:read-letters";

/** 이 브라우저에서 읽은 편지 ID (읽은 봉투는 편지지가 빠져나온 모습으로 보인다) */
function loadRead(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(READ_KEY) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

function saveRead(ids: Set<string>): void {
  try {
    localStorage.setItem(READ_KEY, JSON.stringify([...ids]));
  } catch {
    // 저장이 막힌 브라우저면 이번에만 기억한다
  }
}

type Props = {
  /** 받는 사람 (마을 주인 닉네임) */
  recipientName: string;
  letters: readonly LetterSummary[];
  /** 편지 하나의 내용을 서버에서 꺼낸다 (12/25 이후, 마을 주인만 성공한다) */
  openLetter: (letterId: string) => Promise<{ content: string }>;
  onClose: () => void;
};

/**
 * 집 옆 우체통: 마을에 온 편지를 봉투 그림으로 모아 본다.
 * 12/25 전에는 봉인된 봉투만 보이고, 12/25부터 봉투를 누르면 바로 편지지가 펼쳐진다.
 */
export function LetterBox({ recipientName, letters, openLetter, onClose }: Props) {
  const openable = isLetterOpen();
  const [reading, setReading] = useState<LetterSummary | null>(null);
  const [page, setPage] = useState(0);
  const [read, setRead] = useState<Set<string>>(loadRead);
  const pageCount = Math.max(1, Math.ceil(letters.length / PAGE_SIZE));
  const current = Math.min(page, pageCount - 1);
  const shown = letters.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);
  const rows = PAGE_SIZE / COLS;

  if (reading) {
    return (
      <LetterCard
        authorName={reading.authorName}
        recipientName={recipientName}
        autoOpen
        onOpen={async () => {
          const letter = await openLetter(reading.letterId);
          const next = new Set(read).add(reading.letterId);
          setRead(next);
          saveRead(next);
          return letter;
        }}
        onClose={() => setReading(null)}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#1A173066] px-5" onClick={onClose}>
      <div
        className="pixel-box pixel-box-flat relative flex w-full max-w-[340px] flex-col gap-4 px-4 pb-4 pt-4 text-ink"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute right-2 top-2">
          <PixelButton iconOnly size="sm" icon="close" aria-label="닫기" onClick={onClose} />
        </div>

        <div className="flex flex-col gap-1.5 pr-10">
          <p className="flex items-center gap-2 text-[12px] font-bold">
            <PixelIcon name="snowflake" scale={2} />
            우체통
            <span className="bg-[#DCE5F2] px-1.5 py-0.5 text-ink">{letters.length}통</span>
          </p>
          <p className="text-[12px] text-[#6B7896]">
            {openable ? "봉인된 편지를 눌러 열어 보세요" : `12월 25일에 열 수 있어요 · ${christmasLabel()}`}
          </p>
        </div>

        {/* 봉투 칸: 4개씩 2줄로 고정. 편지가 몇 통이든 같은 크기 */}
        <div style={{ height: rows * CELL_H + (rows - 1) * ROW_GAP }}>
          {letters.length === 0 ? (
            <p className="flex h-full flex-col items-center justify-center text-center text-[12px] leading-[1.7] text-[#6B7896]">
              아직 편지가 없어요.
              <br />
              친구에게 링크를 보내 보세요!
            </p>
          ) : (
            <ul className="grid grid-cols-4" style={{ rowGap: ROW_GAP }}>
              {shown.map((letter) => {
                const opened = read.has(letter.letterId);
                return (
                  <li key={letter.letterId}>
                    <button
                      type="button"
                      disabled={!openable}
                      onClick={() => setReading(letter)}
                      title={`From. ${letter.authorName}`}
                      style={{ height: CELL_H }}
                      className="flex w-full flex-col items-center justify-end gap-1.5 transition-transform enabled:hover:-translate-y-[3px] enabled:active:translate-y-[1px] disabled:cursor-default"
                    >
                      <EnvelopeArt opened={opened} />
                      <span
                        className={`w-full truncate px-0.5 text-center text-[12px] ${opened ? "text-[#A9B8D6]" : "text-ink"}`}
                      >
                        {letter.authorName}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* 페이지 넘기기: 봉투와 띄워서 따로 보이게. 페이지가 하나뿐이어도 자리는 남겨 둬서 창 크기가 항상 같다 */}
        <div className={`flex items-center justify-center gap-4 ${pageCount > 1 ? "" : "invisible"}`}>
          <PixelButton iconOnly size="sm" icon="prev" aria-label="이전 편지" disabled={current === 0} onClick={() => setPage(current - 1)} />
          <span className="w-12 text-center text-[12px] font-bold text-ink">
            {current + 1} / {pageCount}
          </span>
          <PixelButton
            iconOnly
            size="sm"
            icon="next"
            aria-label="다음 편지"
            disabled={current === pageCount - 1}
            onClick={() => setPage(current + 1)}
          />
        </div>
      </div>
    </div>
  );
}

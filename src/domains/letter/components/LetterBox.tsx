"use client";

import { useState } from "react";
import { PixelButton } from "@/shared/components/PixelButton";
import { PixelDialog } from "@/shared/components/PixelDialog";
import { PixelIcon } from "@/shared/components/PixelIcon";
import { PixelPanel } from "@/shared/components/PixelPanel";
import { christmasLabel, isLetterOpen } from "../lib/dday";
import { LetterCard } from "./LetterCard";

export type LetterSummary = { letterId: string; authorName: string };

const READ_KEY = "degul:read-letters";

/** 이 브라우저에서 읽은 편지 ID (읽은 편지는 이름이 흐려지고 "다시 읽기"가 된다) */
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
 * 집 옆 우체통: 마을에 온 편지를 편지지 행으로 모아 본다.
 * 12/25 전에는 자물쇠와 "잠김", 12/25부터는 행마다 "열기" 버튼이 생긴다. 읽은 편지는 봉인 도트가 빠진다.
 */
export function LetterBox({ recipientName, letters, openLetter, onClose }: Props) {
  const openable = isLetterOpen();
  const [reading, setReading] = useState<LetterSummary | null>(null);
  const [read, setRead] = useState<Set<string>>(loadRead);

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
    <PixelDialog
      title="우체통"
      icon="mailbox"
      align="start"
      badge={String(letters.length)}
      caption={openable ? "메리 크리스마스! 편지를 열어 보세요" : `12월 25일에 열 수 있어요 · ${christmasLabel()}`}
      onClose={onClose}
      // 우체통은 마을 주인만 연다. 크리스마스 전에 편지가 있으면 링크를 더 보내 보라고만 하고, 당일부터는 위 안내로 충분하다
      footer={
        !openable && letters.length > 0 ? (
          <p className="text-caption w-full text-center">링크를 보내면 편지가 더 모여요</p>
        ) : undefined
      }
    >
      {letters.length === 0 ? (
        <div className="flex flex-col items-center gap-[calc(var(--p)*3)] py-[calc(var(--p)*6)] text-center">
          <PixelIcon name="envelope" scale={3} />
          <p className="text-caption">
            아직 편지가 없어요.
            <br />
            친구에게 링크를 보내 보세요!
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-[calc(var(--p)*4)]">
          {letters.map((letter) => {
            const opened = read.has(letter.letterId);
            return (
              <PixelPanel
                as="li"
                key={letter.letterId}
                tone="paper"
                className="relative flex min-h-[calc(var(--p)*16)] items-center gap-[calc(var(--p)*3)]"
                style={{ padding: "calc(var(--p) * 3) calc(var(--p) * 4)" }}
              >
                {/* 봉인 도트: 오른쪽 위와 왼쪽 아래 모서리 (시안 03). 읽은 편지는 봉인이 풀려 도트를 뗀다 */}
                {!opened && (
                  <>
                    <span aria-hidden className="absolute right-[var(--p)] top-[var(--p)] size-[calc(var(--p)*2)] bg-berry" />
                    <span aria-hidden className="absolute bottom-[var(--p)] left-[var(--p)] size-[calc(var(--p)*2)] bg-berry" />
                  </>
                )}
                <span className={`text-label min-w-0 flex-1 truncate ${opened ? "text-muted" : ""}`}>{letter.authorName}</span>
                {openable ? (
                  <PixelButton size="sm" onClick={() => setReading(letter)}>
                    {opened ? "다시 읽기" : "열기"}
                  </PixelButton>
                ) : (
                  <span className="text-caption flex items-center gap-[var(--p)]">
                    <PixelIcon name="lock" scale={2} />
                    잠김
                  </span>
                )}
              </PixelPanel>
            );
          })}
        </ul>
      )}
    </PixelDialog>
  );
}

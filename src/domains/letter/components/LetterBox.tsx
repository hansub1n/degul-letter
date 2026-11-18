"use client";

import { useState, type CSSProperties } from "react";
import { PixelDialog } from "@/shared/components/PixelDialog";
import { PixelIcon } from "@/shared/components/PixelIcon";
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
 * 집 옆 우체통: 마을에 온 편지를 봉투 타일로 3열 격자에 늘어놓는다.
 * 12/25 전에는 꺼진 타일(흐린 회색 + 자물쇠 + "12월 25일에 열려요"), 12/25부터는 봉인된 봉투를 눌러 연다.
 * 읽은 편지는 봉투가 열린 모습이 되고 이름이 흐려진다.
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
        <ul className="grid grid-cols-3 gap-[calc(var(--p)*3)]">
          {letters.map((letter, i) => (
            <EnvelopeTile
              key={letter.letterId}
              letter={letter}
              index={i}
              openable={openable}
              opened={read.has(letter.letterId)}
              onOpen={() => setReading(letter)}
            />
          ))}
        </ul>
      )}
    </PixelDialog>
  );
}


/** 봉투 타일 하나. 위에 큰 봉투(또는 자물쇠), 아래에 보낸 사람 이름(최대 두 줄) */
function EnvelopeTile({
  letter,
  index,
  openable,
  opened,
  onOpen,
}: {
  letter: LetterSummary;
  index: number;
  openable: boolean;
  opened: boolean;
  onOpen: () => void;
}) {
  const label = openable
    ? `${letter.authorName}의 편지 ${opened ? "다시 읽기" : "열기"}`
    : `${letter.authorName}의 편지, 12월 25일에 열려요`;
  return (
    <li className="flex">
      <button
        type="button"
        aria-label={label}
        aria-disabled={!openable || undefined}
        onClick={() => {
          if (openable) onOpen();
        }}
        data-tone="paper"
        className="envelope-tile pixel-box flex w-full flex-col items-center gap-[calc(var(--p)*2)]"
        style={{ padding: "calc(var(--p) * 3) calc(var(--p) * 2)" }}
      >
        {openable ? (
          <>
            <span
              className={`flex ${opened ? "" : "envelope-bob"}`}
              style={opened ? undefined : ({ "--bob-delay": `${-((index * 2) % 3) * 0.4}s` } as CSSProperties)}
            >
              <PixelIcon name={opened ? "envOpened" : "envSealed"} scale={3} />
            </span>
            <span className={`text-label w-full break-all text-center line-clamp-2 ${opened ? "text-muted" : ""}`}>
              {letter.authorName}
            </span>
          </>
        ) : (
          <>
            {/* 봉투 자리(높이 66px)에 자물쇠만 가운데 둔다 */}
            <span className="flex h-[66px] items-center justify-center">
              <PixelIcon name="lock" scale={3} />
            </span>
            <span className="text-caption w-full break-keep text-center">12월 25일에 열려요</span>
          </>
        )}
      </button>
    </li>
  );
}

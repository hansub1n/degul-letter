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
 * 12/25 전에는 격자 전체에 반투명 잠금 덮개(흐린 회색 + 자물쇠 + "12월 25일에 열려요")를 씌우고, 12/25부터는 봉인된 봉투를 눌러 연다.
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
        // 12/25 전에는 봉투들 위에 반투명 잠금 덮개 하나를 씌운다 (봉투와 이름은 흐리게 비친다)
        <div className="relative" style={openable ? undefined : { minHeight: "calc(var(--p) * 60)" }}>
          <ul className="grid grid-cols-3 gap-[calc(var(--p)*3)]" aria-hidden={!openable || undefined} inert={!openable}>
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
          {!openable && (
            <div className="mailbox-lock pixel-box absolute inset-0 flex flex-col items-center justify-center gap-[calc(var(--p)*4)]">
              <PixelIcon name="lock" scale={6} />
              <p className="text-label">12월 25일에 열려요</p>
            </div>
          )}
        </div>
      )}
    </PixelDialog>
  );
}

/** 봉투 타일 하나. 위에 큰 봉투, 아래에 보낸 사람 이름(최대 두 줄). 12/25 전에는 잠금 덮개 아래에서 가만히 있다 */
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
  const bob = openable && !opened;
  return (
    <li className="flex">
      <button
        type="button"
        aria-label={`${letter.authorName}의 편지 ${opened ? "다시 읽기" : "열기"}`}
        disabled={!openable}
        onClick={onOpen}
        data-tone="paper"
        className="envelope-tile pixel-box flex w-full flex-col items-center gap-[calc(var(--p)*2)]"
        style={{ padding: "calc(var(--p) * 3) calc(var(--p) * 2)" }}
      >
        <span
          className={`flex ${bob ? "envelope-bob" : ""}`}
          style={bob ? ({ "--bob-delay": `${-((index * 2) % 3) * 0.4}s` } as CSSProperties) : undefined}
        >
          <PixelIcon name={opened ? "envOpened" : "envSealed"} scale={3} />
        </span>
        <span className={`text-label w-full break-all text-center line-clamp-2 ${opened ? "text-muted" : ""}`}>
          {letter.authorName}
        </span>
      </button>
    </li>
  );
}

"use client";

import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { PixelButton } from "@/shared/components/PixelButton";
import { PixelDialog } from "@/shared/components/PixelDialog";
import { PixelIcon } from "@/shared/components/PixelIcon";
import { christmasLabel, isLetterOpen } from "../lib/dday";
import { LetterCard } from "./LetterCard";

export type LetterSummary = { letterId: string; authorName: string };

const READ_KEY = "degul:read-letters";
/** 한 면은 3열 2줄. 휴대폰(360 폭 창)에서 3줄+넘김+잠금 덮개가 한 화면에 빡빡해 보여 6통으로 나눈다. */
const PAGE_SIZE = 6;

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
 * 집 옆 우체통: 마을에 온 편지를 봉투 타일로 3열 격자에 늘어놓는다. 한 면에 6통을 넘으면 ◀ 1 / 3 ▶ 로 넘긴다.
 * 12/25 전에는 격자와 넘김 단추 전체에 반투명 잠금 덮개를 씌워 잠긴 느낌이 나게 하고, 12/25부터는 봉인된 봉투를 눌러 연다.
 * 읽은 편지는 봉투가 열린 모습이 되고 이름이 흐려진다.
 */
export function LetterBox({ recipientName, letters, openLetter, onClose }: Props) {
  const openable = isLetterOpen();
  const [reading, setReading] = useState<LetterSummary | null>(null);
  const [read, setRead] = useState<Set<string>>(loadRead);
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(letters.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const pageLetters = letters.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE);
  const paged = pageCount > 1;
  // 마지막 면에 편지가 한 줄뿐이어도 창 높이가 줄지 않게, 지금까지 본 가장 큰 격자 높이를 유지한다
  const gridRef = useRef<HTMLUListElement>(null);
  const [gridMinHeight, setGridMinHeight] = useState(0);
  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (!paged || !grid) return;
    const measure = () => {
      const prev = grid.style.minHeight;
      grid.style.minHeight = "";
      const h = grid.offsetHeight;
      grid.style.minHeight = prev;
      setGridMinHeight((m) => (h > m ? h : m));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(grid);
    return () => ro.disconnect();
  }, [paged, currentPage, reading]);

  if (reading) {
    return (
      <LetterCard
        letterId={reading.letterId}
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
        // 12/25 전에는 봉투와 페이지 넘김 위에 반투명 잠금 덮개 하나를 씌운다 (단추는 꺼 둔다)
        <div className="relative" style={openable || paged ? undefined : { minHeight: "calc(var(--p) * 60)" }}>
          <ul
            ref={gridRef}
            className="grid grid-cols-3 content-start gap-[calc(var(--p)*3)]"
            style={paged && gridMinHeight ? { minHeight: gridMinHeight } : undefined}
            aria-hidden={!openable || undefined} inert={!openable}>
            {pageLetters.map((letter, i) => (
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
          {paged && (
            <div className="mailbox-pager">
              <PixelButton
                iconOnly
                size="sm"
                icon="prev"
                aria-label="이전 쪽"
                disabled={!openable || currentPage <= 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              />
              <p className="text-label tabular-nums">
                {currentPage + 1} / {pageCount}
              </p>
              <PixelButton
                iconOnly
                size="sm"
                icon="next"
                aria-label="다음 쪽"
                disabled={!openable || currentPage >= pageCount - 1}
                onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              />
            </div>
          )}
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

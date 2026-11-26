"use client";

import { useState, type CSSProperties } from "react";
import { PixelButton } from "@/shared/components/PixelButton";
import { PixelDialog } from "@/shared/components/PixelDialog";
import { PixelIcon } from "@/shared/components/PixelIcon";
import { christmasLabel, isLetterOpen } from "../lib/dday";
import { LetterCard } from "./LetterCard";

export type LetterSummary = { letterId: string; authorName: string };

/** 마을 주인이 숨긴 눈사람. 눈사람과 편지는 한 덩어리라, 숨긴 동안 그 편지는 격자·개수·열람에서 빠진다 */
export type HiddenSnowmanSummary = { id: string; authorName: string; hasLetter: boolean };

const READ_KEY = "degul:read-letters";
/** 한 면은 3열 2줄. 휴대폰(360 폭 창)에서 3줄+넘김+잠금 덮개가 한 화면에 빡빡해 보여 6통으로 나눈다. */
/**
 * 한 면에 2칸 × 2줄 = 4통. 3칸 × 2줄(6통)로 두면 칸 폭이 약 90px라 닉네임 8자(약 100px)도 한 줄에 안 들어가서,
 * 이름이 다 보이게 2칸으로 둔다.
 */
const PAGE_SIZE = 4;
/** 봉투 칸 높이와, 창 크기를 고정할 상자 높이 (3px 칸 단위). 편지가 없을 때·한 면일 때·여러 면일 때 모두 같은 크기 */
const TILE_H = 40;
const BOX_H = TILE_H * 2 + 3 + 20;

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
  /** 숨긴 눈사람 목록 (없으면 숨긴 눈사람 칸을 띄우지 않는다). 편지는 다시 보이게 한 뒤에만 읽을 수 있다 */
  hiddenSnowmen?: readonly HiddenSnowmanSummary[];
  /** 숨긴 눈사람을 다시 보이게 한다. 실패하면 예외를 던진다 */
  onUnhide?: (snowmanId: string) => Promise<void>;
  onClose: () => void;
};

/**
 * 집 옆 우체통: 마을에 온 편지를 봉투 타일로 3열 격자에 늘어놓는다. 한 면에 6통을 넘으면 ◀ 1 / 3 ▶ 로 넘긴다.
 * 12/25 전에는 격자와 넘김 단추 전체에 반투명 잠금 덮개를 씌워 잠긴 느낌이 나게 하고, 12/25부터는 봉인된 봉투를 눌러 연다.
 * 읽은 편지는 봉투가 열린 모습이 되고 이름이 흐려진다.
 */
export function LetterBox({ recipientName, letters, openLetter, hiddenSnowmen = [], onUnhide, onClose }: Props) {
  const openable = isLetterOpen();
  const [hiddenOpen, setHiddenOpen] = useState(false);
  const [reading, setReading] = useState<LetterSummary | null>(null);
  const [read, setRead] = useState<Set<string>>(loadRead);
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(letters.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const pageLetters = letters.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE);
  const paged = pageCount > 1;
  if (hiddenOpen && onUnhide) {
    return <HiddenList items={hiddenSnowmen} onUnhide={onUnhide} onBack={() => setHiddenOpen(false)} />;
  }
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
      // 아래 안내 줄 자리는 늘 남겨 둔다 (안내가 없을 때도 보이지만 않게). 그래야 창 크기가 상태마다 같다
      footer={
        <div className="flex w-full flex-col items-center gap-[calc(var(--p)*2)]">
          {onUnhide && hiddenSnowmen.length > 0 && (
            <PixelButton size="sm" onClick={() => setHiddenOpen(true)}>
              숨긴 눈사람 {hiddenSnowmen.length}개
            </PixelButton>
          )}
          <p className={`text-caption w-full text-center ${!openable && letters.length > 0 ? "" : "invisible"}`}>
            링크를 보내면 편지가 더 모여요
          </p>
        </div>
      }
    >
      {/* 창 크기 고정: 편지가 없어도, 한 면뿐이어도 페이지 넘김이 있을 때와 같은 높이의 상자 안에 그린다 */}
      <div className="relative flex flex-col" style={{ height: `calc(var(--p) * ${BOX_H})` }}>
        {letters.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-[calc(var(--p)*3)] text-center">
            <PixelIcon name="envelope" scale={3} />
            <p className="text-caption">
              아직 편지가 없어요.
              <br />
              친구에게 링크를 보내 보세요!
            </p>
          </div>
        ) : (
          <>
            <ul
              className="grid grid-cols-2 content-start gap-[calc(var(--p)*3)]"
              style={{ gridAutoRows: `calc(var(--p) * ${TILE_H})` }}
              aria-hidden={!openable || undefined}
              inert={!openable}
            >
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
            {/* 페이지 넘김 자리는 한 면뿐이어도 남겨 둔다 (보이지만 않게) */}
            <div className={`mailbox-pager mt-auto ${paged ? "" : "invisible"}`} aria-hidden={!paged || undefined}>
              <PixelButton
                iconOnly
                size="sm"
                icon="prev"
                aria-label="이전 쪽"
                disabled={!openable || !paged || currentPage <= 0}
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
                disabled={!openable || !paged || currentPage >= pageCount - 1}
                onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              />
            </div>
            {!openable && (
              <div className="mailbox-lock pixel-box absolute inset-0 flex flex-col items-center justify-center gap-[calc(var(--p)*4)]">
                <PixelIcon name="lock" scale={6} />
                <p className="text-label">12월 25일에 열려요</p>
              </div>
            )}
          </>
        )}
      </div>
    </PixelDialog>
  );
}

/** 봉투 타일 하나. 위에 큰 봉투, 아래에 보낸 사람 이름(한 줄). 12/25 전에는 잠금 덮개 아래에서 가만히 있다 */
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
        className="envelope-tile pixel-box flex w-full flex-col items-center justify-center gap-[calc(var(--p)*2)]"
        style={{ padding: "calc(var(--p) * 3) calc(var(--p) * 2)" }}
      >
        <span
          className={`flex ${bob ? "envelope-bob" : ""}`}
          style={bob ? ({ "--bob-delay": `${-((index * 2) % 3) * 0.4}s` } as CSSProperties) : undefined}
        >
          <PixelIcon name={opened ? "envOpened" : "envSealed"} scale={3} />
        </span>
        <span className={`text-label w-full truncate text-center ${opened ? "text-muted" : ""}`}>
          {letter.authorName}
        </span>
      </button>
    </li>
  );
}

/**
 * 숨긴 눈사람 목록. 주인은 여기서 누가 남긴 눈사람인지 확인하고 다시 보이게 한다.
 * 다시 보이게 하면 같은 자리에 눈사람이 나타나고, 편지도 우체통에 돌아온다.
 */
function HiddenList({
  items,
  onUnhide,
  onBack,
}: {
  items: readonly HiddenSnowmanSummary[];
  onUnhide: (snowmanId: string) => Promise<void>;
  onBack: () => void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  const unhide = async (id: string) => {
    setBusyId(id);
    setFailed(false);
    try {
      await onUnhide(id);
    } catch {
      setFailed(true);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <PixelDialog
      title="숨긴 눈사람"
      align="start"
      badge={String(items.length)}
      caption="같은 자리에 다시 나타나고 편지도 돌아와요"
      onClose={onBack}
      footer={
        <div className="flex w-full flex-col items-center gap-[calc(var(--p)*2)]">
          {failed && (
            <p role="alert" className="text-caption w-full text-center">
              처리하지 못했어요. 잠시 후 다시 눌러 주세요
            </p>
          )}
          <PixelButton size="sm" onClick={onBack}>
            우체통으로
          </PixelButton>
        </div>
      }
    >
      {items.length === 0 ? (
        <p className="text-caption py-[calc(var(--p)*4)] text-center">숨긴 눈사람이 없어요</p>
      ) : (
        <ul className="flex flex-col gap-[calc(var(--p)*3)]">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-[calc(var(--p)*3)]">
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-label truncate">{item.authorName}</span>
                <span className="text-caption">{item.hasLetter ? "편지가 들어 있어요" : "편지 없음"}</span>
              </span>
              <PixelButton size="sm" disabled={busyId !== null} onClick={() => void unhide(item.id)}>
                다시 보이기
              </PixelButton>
            </li>
          ))}
        </ul>
      )}
    </PixelDialog>
  );
}

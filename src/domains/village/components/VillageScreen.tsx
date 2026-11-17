"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  christmasLabel,
  createLetter,
  deleteLetter,
  isLetterOpen,
  LetterBox,
  LetterCard,
  openLetter,
} from "@/domains/letter";
import { HintPill } from "@/shared/components/HintPill";
import { PixelButton } from "@/shared/components/PixelButton";
import { ensureUserId } from "@/shared/lib/session";
import { deleteSnowman, getVillageByCode, listSnowmen, saveSnowman } from "../api";
import type { SavedSnowman, SnowmanDraft, Village } from "../types";
import { FinishDialog } from "./FinishDialog";
import { VillageGame, type MarkSaved } from "./VillageGame";
import { VillageTitle } from "./VillageTitle";

const FINISH_DIALOG_DELAY_MS = 2000;

type Loaded = { village: Village; saved: SavedSnowman[]; myId: string };
type PendingSave = { draft: SnowmanDraft; markSaved: MarkSaved };

/** 공유 링크(/v/[code])로 들어온 마을. 저장된 눈사람을 불러와 세우고, 새로 완성한 눈사람과 편지를 저장한다. */
export function VillageScreen() {
  const { code } = useParams<{ code: string }>();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [problem, setProblem] = useState<"notFound" | "error" | null>(null);
  const [pending, setPending] = useState<PendingSave | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  // 눈사람 ID → 편지 ID. 편지 개수를 세고, 눈사람을 부술 때 편지도 지우는 데 쓴다.
  // 마을에 온 편지 목록 (눈사람 ID → 편지 ID, 보낸 사람). 우체통 목록·편지 수·부술 때 편지 지우기에 쓴다.
  const [letters, setLetters] = useState<Array<{ snowmanId: string; letterId: string; authorName: string }>>([]);
  const letterCount = letters.length;
  const [mailboxOpen, setMailboxOpen] = useState(false);
  const [openingLetter, setOpeningLetter] = useState<{ authorName: string; savedId: string } | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const myId = await ensureUserId();
        const village = await getVillageByCode(code);
        if (!village) {
          if (alive) setProblem("notFound");
          return;
        }
        const saved = await listSnowmen(village.id);
        if (!alive) return;
        setLetters(
          saved.flatMap((s) => (s.letterId ? [{ snowmanId: s.id, letterId: s.letterId, authorName: s.authorName }] : [])),
        );
        setLoaded({ village, saved, myId });
      } catch (e) {
        console.error(e);
        if (alive) setProblem("error");
      }
    })();
    return () => {
      alive = false;
    };
  }, [code]);

  useEffect(() => {
    if (!status) return;
    const timer = window.setTimeout(() => setStatus(null), 2500);
    return () => window.clearTimeout(timer);
  }, [status]);

  if (problem) {
    return (
      <Center>
        <HintPill>
          {problem === "notFound"
            ? "마을을 찾을 수 없어요. 링크를 다시 확인해 주세요."
            : "마을을 불러오지 못했어요. 잠시 후 다시 들어와 주세요."}
        </HintPill>
      </Center>
    );
  }
  if (!loaded) {
    return (
      <Center>
        <HintPill>마을로 가는 중…</HintPill>
      </Center>
    );
  }

  const { village, saved, myId } = loaded;
  const isOwner = village.ownerId === myId;

  const save = async ({ draft, markSaved }: PendingSave, name: string, letter: string) => {
    setStatus("눈사람을 세우는 중…");
    try {
      // 편지를 먼저 묻고, 그 ID를 눈사람에 적어 둔다
      const letterId = letter ? await createLetter(village.id, name, letter) : null;
      const row = await saveSnowman(village.id, name, draft, letterId);
      markSaved(row.id, name, letterId !== null);
      if (letterId) {
        setLetters((list) => [...list, { snowmanId: row.id, letterId, authorName: name }]);
      }
      setStatus(letterId ? "편지는 12월 25일에 열려요 ⛄" : "마을에 눈사람을 세웠어요!");
    } catch (e) {
      console.error(e);
      setStatus("저장하지 못했어요. 인터넷 연결을 확인해 주세요.");
    }
  };

  const removeSaved = async (snowmanId: string) => {
    const letterId = letters.find((l) => l.snowmanId === snowmanId)?.letterId;
    try {
      if (letterId) await deleteLetter(letterId);
      await deleteSnowman(snowmanId);
      if (letterId) {
        setLetters((list) => list.filter((l) => l.snowmanId !== snowmanId));
      }
    } catch (e) {
      console.error(e);
    }
  };

  /** 휴대폰이면 공유 창(카카오톡 등)을 띄우고, 공유 창이 없는 곳(PC 등)에서는 링크를 복사한다 */
  const shareLink = async () => {
    const url = `${window.location.origin}/v/${village.code}`;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: "데굴레터", text: `${village.name}의 마을에 눈사람을 세우고 편지를 남겨 줘!`, url });
        return;
      } catch (e) {
        // 사용자가 공유 창을 닫은 경우엔 아무것도 하지 않는다
        if ((e as DOMException).name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setStatus("링크를 복사했어요. 친구에게 보내 주세요!");
    } catch {
      window.prompt("이 링크를 복사해서 친구에게 보내 주세요", url);
    }
  };

  return (
    <>
      <VillageGame
        saved={saved}
        myId={myId}
        // 마을로 돌아오는 확대(0.5초)와 "완성!" 축하가 끝난 뒤에 이름·편지 창을 띄운다
        onSnowmanFinished={(draft, markSaved) => {
          window.setTimeout(() => setPending({ draft, markSaved }), FINISH_DIALOG_DELAY_MS);
        }}
        onSavedSnowmanBroken={(id) => void removeSaved(id)}
        isOwner={isOwner}
        mailCount={letterCount}
        onOpenMailbox={() => setMailboxOpen(true)}
        onOpenLetter={(snowman) => {
          if (snowman.savedId) setOpeningLetter({ authorName: snowman.authorName ?? "친구", savedId: snowman.savedId });
        }}
        overlay={
          <VillageTitle
            name={`${village.name}의 마을`}
            subtitle={
              isOwner
                ? isLetterOpen()
                  ? `메리 크리스마스! 편지 ${letterCount}통을 열어 보세요`
                  : letterCount > 0
                    ? `편지 ${letterCount}통이 기다려요 · 크리스마스 ${christmasLabel()}`
                    : `친구에게 링크를 보내 보세요 · 크리스마스 ${christmasLabel()}`
                : "눈사람을 세우고 편지를 남겨 주세요"
            }
          />
        }
        header={
          isOwner ? (
            <div className="flex justify-end p-1">
              <PixelButton icon="send" label="친구에게 링크 보내기" onClick={shareLink} />
            </div>
          ) : undefined
        }
      />
      {status && (
        <HintPill role="status" className="fixed bottom-6 left-1/2 z-30 -translate-x-1/2 whitespace-nowrap">
          {status}
        </HintPill>
      )}
      {mailboxOpen && (
        <LetterBox
          recipientName={village.name}
          letters={letters}
          openLetter={(letterId) => openLetter(village.id, letterId)}
          onClose={() => setMailboxOpen(false)}
        />
      )}
      {openingLetter && (
        <LetterCard
          authorName={openingLetter.authorName}
          recipientName={village.name}
          onOpen={async () => {
            const letterId = letters.find((l) => l.snowmanId === openingLetter.savedId)?.letterId;
            if (!letterId) throw new Error("편지를 찾을 수 없어요");
            return openLetter(village.id, letterId);
          }}
          onClose={() => setOpeningLetter(null)}
        />
      )}
      {pending && (
        <FinishDialog
          {...(isOwner
            ? { mode: "owner" as const }
            : { mode: "visitor" as const, recipient: village.name })}
          onSubmit={({ name, letter }) => {
            const job = pending;
            setPending(null);
            void save(job, name, letter);
          }}
        />
      )}
    </>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="fixed inset-0 flex items-center justify-center bg-[#F2F6FB] px-6">{children}</div>;
}

"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppwriteException } from "appwrite";
import {
  christmasLabel,
  createLetter,
  deleteLetter,
  isLetterOpen,
  LetterBox,
  LetterCard,
  openLetter,
} from "@/domains/letter";
import { InviteLogin, isLoggedIn, logout, LogoutConfirm } from "@/domains/auth";
import { FootstepsLoader } from "@/shared/components/FootstepsLoader";
import { InviteTicket } from "@/shared/components/InviteTicket";
import { PixelButton } from "@/shared/components/PixelButton";
import { PixelDialog } from "@/shared/components/PixelDialog";
import { PixelToast } from "@/shared/components/PixelToast";
import { isModalLocked } from "@/shared/lib/modalLock";
import { describeError, reportClientError } from "@/shared/lib/clientError";
import { ensureUserId, forgetUserId } from "@/shared/lib/session";
import { shareVillage } from "../share";
import { deleteSnowman, findMyVillage, getVillageByCode, listSnowmen, saveSnowman } from "../api";
import type { SavedSnowman, SnowmanDraft, Village } from "../types";
import { ErrorScreen } from "./ErrorScreen";
import { FinishDialog } from "./FinishDialog";
import { GoHomeConfirm } from "./GoHomeConfirm";
import { LetterFlight } from "./LetterFlight";
import { LeaveConfirm } from "./LeaveConfirm";
import { VillageGame, type MarkSaved, type VillageGameApi } from "./VillageGame";
import { VillageSign } from "./VillageSign";

/** "완성!" 축하가 끝나고 편지 창이 뜨기 전 한 박자 쉬는 시간 (바로 뜨면 뚝 끊기는 느낌이 든다) */
const AFTER_CELEBRATE_PAUSE_MS = 350;

type Loaded = {
  village: Village;
  saved: SavedSnowman[];
  myId: string;
  myVillage: Village | null;
  /** 카카오 로그인 상태. 주인은 로그아웃 말풍선, 방문자는 초대장(로그인 카드)을 띄울지 정한다 */
  loggedIn: boolean;
};
/** 마을을 떠나는 곳: 다른 화면 주소, 또는 로그아웃 */
type LeaveTarget = string | typeof LOGOUT;
const LOGOUT = Symbol("logout");

type PendingSave = { stackId: number; draft: SnowmanDraft; markSaved: MarkSaved };

/** 공유 링크(/v/[code])로 들어온 마을. 저장된 눈사람을 불러와 세우고, 새로 완성한 눈사람과 편지를 저장한다. */
export function VillageScreen() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const gameApiRef = useRef<VillageGameApi | null>(null);
  const [leaveTo, setLeaveTo] = useState<LeaveTarget | null>(null);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [goHomeOpen, setGoHomeOpen] = useState(false);
  /** 편지를 넣은 직후 봉투가 눈사람에게 날아가는 연출 */
  const [flight, setFlight] = useState<{ stackId: number; key: number } | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [problem, setProblem] = useState<"notFound" | "error" | null>(null);
  const [pending, setPending] = useState<PendingSave | null>(null);
  // 완성했지만 아직 편지를 넣지 않은 눈사람 (창을 취소한 경우). 다시 다가가면 "편지 쓰기"가 뜬다.
  const [drafts, setDrafts] = useState<Map<number, PendingSave>>(() => new Map());
  /** 완성 직후(편지 창이 뜨기 전) 부순 눈사람. 늦게 뜨는 편지 창을 띄우지 않으려고 기억한다 */
  const brokenRef = useRef<Set<number>>(new Set());
  /** 완성했지만 아직 편지 창을 안 띄운 눈사람. 축하가 끝나면(onSnowmanCelebrated) 꺼내 편지 창을 띄운다 */
  const celebratingRef = useRef<Map<number, PendingSave>>(new Map());
  const [status, setStatus] = useState<string | null>(null);
  // 눈사람 ID → 편지 ID. 편지 개수를 세고, 눈사람을 부술 때 편지도 지우는 데 쓴다.
  // 마을에 온 편지 목록 (눈사람 ID → 편지 ID, 보낸 사람). 우체통 목록·편지 수·부술 때 편지 지우기에 쓴다.
  const [letters, setLetters] = useState<Array<{ snowmanId: string; letterId: string; authorName: string }>>([]);
  const letterCount = letters.length;
  const [mailboxOpen, setMailboxOpen] = useState(false);
  const [openingLetter, setOpeningLetter] = useState<{ authorName: string; savedId: string } | null>(null);

  useEffect(() => {
    // Next.js는 떠난 마을 화면을 숨기기만 하고(React Activity) 상태는 남겨 둔다.
    // 그래서 다시 들어오면 눈사람 말풍선·미저장 초안이 남거나, 멈춘 캔버스만 보일 수 있다.
    // 이 effect는 다시 보일 때도 다시 돌아가므로, 이전 방문 잔여 상태를 비우고 마을을 새로 불러온다.
    let alive = true;
    (async () => {
      // setState를 effect 본문에서 바로 부르면 렌더가 한 번 더 연쇄된다. 한 박자 뒤에 비운다.
      await Promise.resolve();
      if (!alive) return;
      setLoaded(null);
      setProblem(null);
      setPending(null);
      setDrafts(new Map());
      setLeaveTo(null);
      setLogoutOpen(false);
      setGoHomeOpen(false);
      setInviteOpen(false);
      setStatus(null);
      setLetters([]);
      setMailboxOpen(false);
      setOpeningLetter(null);
      try {
        const myId = await ensureUserId();
        const village = await getVillageByCode(code);
        if (!village) {
          if (alive) setProblem("notFound");
          return;
        }
        const savedPromise = listSnowmen(village.id);
        const minePromise =
          village.ownerId === myId
            ? Promise.resolve(null)
            : findMyVillage().catch((err) => {
                console.error(err);
                return null;
              });
        const loggedInPromise = isLoggedIn().catch((err) => {
          console.error(err);
          return false;
        });
        const [saved, myVillage, loggedIn] = await Promise.all([savedPromise, minePromise, loggedInPromise]);
        if (!alive) return;
        setLetters(
          saved.flatMap((s) => (s.letterId ? [{ snowmanId: s.id, letterId: s.letterId, authorName: s.authorName }] : [])),
        );
        setLoaded({ village, saved, myId, myVillage, loggedIn });
      } catch (e) {
        console.error(e);
        reportClientError("load-village", describeError(e), { code });
        if (alive) setProblem("error");
      }
    })();
    return () => {
      alive = false;
    };
  }, [code]);

  useEffect(() => {
    if (!status) return;
    // 저장 실패는 오류 번호를 찍어 보낼 수 있게 더 오래 둔다
    const timer = window.setTimeout(() => setStatus(null), status.startsWith("저장하지 못했어요") ? 6000 : 2500);
    return () => window.clearTimeout(timer);
  }, [status]);

  // 편지를 넣지 않은 눈사람이 있으면 새로고침·탭 닫기 전에 브라우저가 물어보게 한다
  useEffect(() => {
    if (drafts.size === 0 && !pending) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [drafts, pending]);

  // 편지를 아직 안 넣은 눈사람 ID. drafts가 바뀔 때만 새 배열을 만들어, VillageGame이 매 렌더 다시 받지 않게 한다
  const unsentIds = useMemo(() => [...drafts.keys()], [drafts]);

  if (problem) {
    return problem === "notFound" ? (
      <ErrorScreen title="마을을 찾을 수 없어요" description="링크를 다시 확인해 주세요" />
    ) : (
      <ErrorScreen title="마을을 불러오지 못했어요" description="잠시 후 다시 들어와 주세요" onRetry={() => window.location.reload()} />
    );
  }
  if (!loaded) {
    return <FootstepsLoader />;
  }

  const { village, saved, myId, myVillage, loggedIn } = loaded;
  const isOwner = village.ownerId === myId;

  const save = async (job: PendingSave, name: string, letter: string) => {
    const { draft, markSaved } = job;
    setStatus("눈사람을 세우는 중…");
    let step: "session" | "letter" | "snowman" = "session";
    let retried = false;
    // 계정 확인 → 편지 → 눈사람 순서. 편지 ID를 눈사람에 적어 두고, 눈사람 저장이 실패하면 짝 잃은 편지를 지운다.
    const attempt = async (): Promise<{ row: SavedSnowman; letterId: string | null }> => {
      step = "session";
      await ensureUserId();
      step = "letter";
      const letterId = letter ? await createLetter(village.id, name, letter) : null;
      step = "snowman";
      try {
        return { row: await saveSnowman(village.id, name, draft, letterId), letterId };
      } catch (e) {
        if (letterId) await deleteLetter(letterId).catch(() => {});
        throw e;
      }
    };
    try {
      let saved: { row: SavedSnowman; letterId: string | null };
      try {
        saved = await attempt();
      } catch (e) {
        // 계정 확인이 실패하면(401) 계정을 다시 읽어 한 번 더 해 본다
        if (!(e instanceof AppwriteException && e.code === 401)) throw e;
        reportClientError(`save-${step}-401`, describeError(e), { willRetry: true });
        retried = true;
        forgetUserId();
        saved = await attempt();
      }
      const { row, letterId } = saved;
      markSaved(row.id, name, letterId !== null);
      if (letterId) {
        setLetters((list) => [...list, { snowmanId: row.id, letterId, authorName: name }]);
      }
      if (!letterId) setStatus("마을에 눈사람을 세웠어요!");
      else setStatus(isLetterOpen() ? "편지를 넣었어요. 지금 바로 열 수 있어요" : "편지를 넣었어요. 12월 25일에 열려요");
    } catch (e) {
      console.error(e);
      const info = describeError(e);
      reportClientError(`save-${step}`, info, {
        retried,
        isOwner,
        balls: draft.balls.length,
        sculptW: draft.sculpt.width,
        sculptH: draft.sculpt.height,
        nameLength: name.length,
        letterLength: letter.length,
      });
      // 저장에 실패하면 다시 "편지 쓰기"로 시도할 수 있게 남겨 둔다
      setDrafts((m) => new Map(m).set(job.stackId, job));
      // 오류 번호를 같이 보여 줘서, 친구가 화면만 찍어 보내도 원인을 알 수 있게 한다
      setStatus(
        info.network
          ? "저장하지 못했어요. 인터넷 연결을 확인해 주세요."
          : `저장하지 못했어요. 잠시 후 다시 해 주세요 (오류 ${info.code})`,
      );
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


  const leaveNow = (to: LeaveTarget) => {
    if (to === LOGOUT) void logout();
    else router.push(to);
  };

  const hasUnsaved = () => drafts.size > 0 || pending !== null || Boolean(gameApiRef.current?.hasUnsavedWork());

  /** 편지를 안 넣은 눈사람이 있으면 녹는다고 먼저 묻고, 없으면 바로 떠난다 */
  const goOrConfirm = (to: LeaveTarget) => {
    if (isModalLocked()) return;
    if (hasUnsaved()) {
      setLeaveTo(to);
      return;
    }
    leaveNow(to);
  };

  return (
    <>
      <VillageGame
        apiRef={gameApiRef}
        saved={saved}
        myId={myId}
        // 마을로 돌아오는 확대(0.5초)와 "완성!" 축하가 끝나고, 한 박자 쉰 뒤에 이름·편지 창을 띄운다
        onSnowmanFinished={(stackId, draft, markSaved) => {
          const job = { stackId, draft, markSaved };
          brokenRef.current.delete(stackId);
          celebratingRef.current.set(stackId, job);
          setDrafts((m) => new Map(m).set(stackId, job));
        }}
        onSnowmanCelebrated={(stackId) => {
          const job = celebratingRef.current.get(stackId);
          celebratingRef.current.delete(stackId);
          if (!job) return;
          window.setTimeout(() => {
            if (!brokenRef.current.has(stackId)) setPending(job);
          }, AFTER_CELEBRATE_PAUSE_MS);
        }}
        // 편지를 안 넣은 눈사람을 부수면 "녹아 버려요" 대상에서 뺀다 (부순 뒤 나갈 때 잘못 묻지 않게)
        onSnowmanBroken={(stackId) => {
          brokenRef.current.add(stackId);
          celebratingRef.current.delete(stackId);
          setDrafts((m) => {
            if (!m.has(stackId)) return m;
            const next = new Map(m);
            next.delete(stackId);
            return next;
          });
          setPending((p) => (p?.stackId === stackId ? null : p));
        }}
        unsentIds={unsentIds}
        onWriteLetter={(stackId) => {
          const job = drafts.get(stackId);
          if (job) setPending(job);
        }}
        onSavedSnowmanBroken={(id) => void removeSaved(id)}
        isOwner={isOwner}
        mailCount={letterCount}
        // 우체통: 주인은 편지함을 열고, 친구는 언제 열리는지만 본다 (편지는 주인만 읽는다)
        onOpenMailbox={
          isOwner
            ? () => setMailboxOpen(true)
            : () =>
                setStatus(
                  isLetterOpen()
                    ? `${village.name}의 우체통이에요! 편지는 ${village.name}만 열어 볼 수 있어요`
                    : `12월 25일에 열리는 ${village.name}의 우체통이에요!`,
                )
        }
        door={
          isOwner
            ? // 카카오 로그인 전에 만든 마을(익명 주인)은 로그아웃하면 마을을 잃으므로 문 말풍선을 띄우지 않는다
              // 저장 안 한 눈사람이 있으면 "녹아 버려요"가 확인을 겸하고, 없으면 로그아웃 확인 창을 띄운다
              loggedIn
              ? {
                  icon: "houseDoor",
                  label: "로그아웃",
                  onClick: () => {
                    if (isModalLocked()) return;
                    if (hasUnsaved()) setLeaveTo(LOGOUT);
                    else setLogoutOpen(true);
                  },
                }
              : undefined
            : // 놀러 온 친구: 집 앞에서 내 마을로 (마을이 없으면 첫 화면에서 마을 만들기).
              // 저장 안 한 눈사람이 있으면 "녹아 버려요"가 확인을 겸하고, 없으면 확인 창으로 묻는다
              {
                icon: "houseDoor",
                label: myVillage ? "내 마을로" : "내 마을 만들기",
                onClick: () => {
                  if (isModalLocked()) return;
                  if (hasUnsaved()) setLeaveTo(myVillage ? `/v/${myVillage.code}` : "/");
                  else setGoHomeOpen(true);
                },
              }
        }
        onOpenLetter={(snowman) => {
          if (snowman.savedId) setOpeningLetter({ authorName: snowman.authorName ?? "친구", savedId: snowman.savedId });
        }}
        header={
          <div className="pointer-events-none flex items-start justify-between gap-[calc(var(--p)*3)] p-[var(--p)]">
            <VillageSign
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
            {isOwner ? (
              <PixelButton
                variant="primary"
                iconOnly
                icon="share"
                aria-label="링크 보내기"
                className="pointer-events-auto ml-auto shrink-0"
                onClick={() => {
                  if (!isModalLocked()) void shareVillage(village.code, setStatus);
                }}
              />
            ) : myVillage ? (
              // 내 마을이 있는 친구: 주인의 종이비행기 버튼과 같은 모양. 아이콘은 집 문 말풍선과 같은 반쯤 열린 문
              <PixelButton
                variant="primary"
                iconOnly
                icon="houseDoor"
                aria-label="내 마을 가기"
                className="pointer-events-auto ml-auto shrink-0"
                onClick={() => goOrConfirm(`/v/${myVillage.code}`)}
              />
            ) : (
              <InviteTicket
                className="pointer-events-auto ml-auto shrink-0"
                // 로그인 안 한 방문자: 마을 위에 초대장 카드를 띄워 바로 카카오로 로그인한다.
                // 이미 로그인했으면(마을만 아직 없음) 첫 화면의 닉네임 입력으로 간다
                onClick={() => {
                  if (isModalLocked()) return;
                  if (loggedIn) goOrConfirm("/");
                  else setInviteOpen(true);
                }}
              />
            )}
          </div>
        }
      />
      {/* 저장 상태 알림: 처음 몇 초 뜨는 조작 안내(같은 아래쪽 자리)와 겹치지 않게 그 위로 올린다 */}
      {status && (
        <PixelToast key={status} lift={48}>
          {status}
        </PixelToast>
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
          letterId={letters.find((l) => l.snowmanId === openingLetter.savedId)?.letterId}
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
            setDrafts((m) => {
              const next = new Map(m);
              next.delete(job.stackId);
              return next;
            });
            setFlight({ stackId: job.stackId, key: Date.now() });
            void save(job, name, letter);
          }}
          // 취소·Esc: 저장하지 않고 닫는다. 눈사람은 그대로 두고, 다시 다가가면 "편지 쓰기"로 열 수 있다.
          onCancel={() => setPending(null)}
        />
      )}
      {inviteOpen && <InviteLogin variant="overlay" onClose={() => setInviteOpen(false)} />}
      {flight && (
        <LetterFlight
          key={flight.key}
          target={() => gameApiRef.current?.stackChestScreen(flight.stackId) ?? null}
          onDone={() => setFlight(null)}
        />
      )}
      {logoutOpen && <LogoutConfirm onClose={() => setLogoutOpen(false)} />}
      {goHomeOpen && (
        <GoHomeConfirm
          hasVillage={myVillage !== null}
          onGo={() => {
            setGoHomeOpen(false);
            router.push(myVillage ? `/v/${myVillage.code}` : "/");
          }}
          onClose={() => setGoHomeOpen(false)}
        />
      )}
      {leaveTo && (
        <PixelDialog title="눈사람이 녹아 버려요" hideHeader closeOnVeil onClose={() => setLeaveTo(null)}>
          <div className="flex min-h-full w-full flex-1 flex-col justify-center self-stretch">
            <LeaveConfirm
              onKeepWriting={() => setLeaveTo(null)}
              onLeave={() => {
                const to = leaveTo;
                setLeaveTo(null);
                leaveNow(to);
              }}
            />
          </div>
        </PixelDialog>
      )}
    </>
  );
}

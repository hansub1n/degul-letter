"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { InviteLogin, isLoggedIn, LogoutConfirm } from "@/domains/auth";
import { useChristmasLabel } from "@/domains/letter";
import { PixelBadge } from "@/shared/components/PixelBadge";
import { PixelButton } from "@/shared/components/PixelButton";
import { PixelField } from "@/shared/components/PixelField";
import { PixelIcon } from "@/shared/components/PixelIcon";
import { PixelPanel } from "@/shared/components/PixelPanel";
import { PixelToast } from "@/shared/components/PixelToast";
import { SantaSleighLoader } from "@/shared/components/SantaSleighLoader";
import { createVillage, findMyVillage } from "../api";
import { BACKDROP_CARD_TOP } from "../lib/render";
import type { Village } from "../types";
import { HomeBackdrop } from "./HomeBackdrop";

/** 첫 화면: 내 마을이 있으면 들어가기·링크 복사, 없으면 로그인 → 마을 만들기 */
export function HomeScreen() {
  const router = useRouter();
  const [mine, setMine] = useState<Village | null | undefined>(undefined);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  /** 마을로 들어가는 중: 카드가 한 칸 내려가며 사라진다 */
  const [leaving, setLeaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  /** 카카오 로그인으로 계정을 지키고 있는지. 마을은 로그인해야 만들 수 있다 */
  const [loggedIn, setLoggedIn] = useState<boolean | undefined>(undefined);
  const [logoutOpen, setLogoutOpen] = useState(false);
  /** 썰매가 빠져나간 뒤(또는 로딩이 300ms 안에 끝나 안 보인 뒤)에만 폼·버튼을 보여 준다 */
  const [loaderDone, setLoaderDone] = useState(false);
  const onLoaderFinished = useCallback(() => setLoaderDone(true), []);
  const dday = useChristmasLabel();

  useEffect(() => {
    let alive = true;
    Promise.all([findMyVillage(), isLoggedIn()])
      .then(([v, login]) => {
        if (!alive) return;
        setLoggedIn(login);
        setMine(v);
      })
      .catch((e) => {
        console.error(e);
        if (alive) {
          setLoggedIn(false);
          setMine(null);
          setMessage("서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.");
        }
      });
    return () => {
      alive = false;
    };
  }, []);

  const create = async () => {
    const trimmed = name.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const village = await createVillage(trimmed);
      setLeaving(true);
      router.push(`/v/${village.code}`);
    } catch (e) {
      console.error(e);
      setMessage("마을을 만들지 못했어요. 잠시 후 다시 시도해 주세요.");
      setBusy(false);
    }
  };

  const copyLink = async (village: Village) => {
    const url = `${window.location.origin}/v/${village.code}`;
    try {
      await navigator.clipboard.writeText(url);
      setMessage("링크를 복사했어요. 친구에게 보내 주세요!");
    } catch {
      window.prompt("이 링크를 복사해서 친구에게 보내 주세요", url);
    }
  };

  const form = (
    <>
      {!loaderDone && (
        <div className="flex min-h-0 flex-1 flex-col justify-center">
          <SantaSleighLoader loading={mine === undefined} onFinished={onLoaderFinished} />
        </div>
      )}

      {loaderDone && mine && (
        <div className="flex w-full flex-1 flex-col justify-center gap-[calc(var(--p)*4)]">
          <p className="text-label text-center">{mine.name}의 마을</p>
          <PixelButton
            variant="primary"
            className="w-full"
            onClick={() => {
              setLeaving(true);
              router.push(`/v/${mine.code}`);
            }}
          >
            내 마을 가기
          </PixelButton>
          <PixelButton icon="send" className="w-full" onClick={() => copyLink(mine)}>
            링크 복사하기
          </PixelButton>
        </div>
      )}

      {loaderDone && mine === null && loggedIn && (
        <form
          className="flex w-full flex-col gap-[calc(var(--p)*4)]"
          onSubmit={(e) => {
            e.preventDefault();
            void create();
          }}
        >
          <PixelField
            id="home-nickname"
            label="내 닉네임"
            placeholder="마을 이름이 돼요"
            value={name}
            maxLength={10}
            onChange={(e) => setName(e.target.value)}
          />
          <PixelButton variant="primary" type="submit" className="w-full" disabled={!name.trim() || busy}>
            {busy ? "만드는 중…" : "마을 만들기"}
          </PixelButton>
        </form>
      )}
    </>
  );

  /** 처음 온 사람(마을도 로그인도 없음): 표지판 대신 초대장 카드에서 카카오로 로그인한다 */
  const inviting = loaderDone && mine === null && loggedIn === false;

  const dDayTag = dday && (
    <PixelBadge icon="holly" data-twinkle className="relative z-10">
      크리스마스 {dday}
    </PixelBadge>
  );

  return (
    <main
      className="fixed inset-0 flex flex-col items-center overflow-y-auto bg-ground px-[calc(var(--p)*6)] pb-[calc(var(--p)*6)]"
      style={{ paddingTop: `calc(var(--p) * ${BACKDROP_CARD_TOP - 3})` }}
    >
      <HomeBackdrop />

      {/* 눈에 박힌 나무 표지판: 위 판자에 이름과 D-day 꼬리표, 아래도 같은 나무 판(결·옹이)에 크림 입력칸, 다리 두 개가 눈 둔덕에 꽂힌다 */}
      <section
        aria-labelledby="home-title"
        hidden={inviting}
        className={`relative flex w-full max-w-[360px] shrink-0 flex-col items-center ${leaving ? "pixel-leave" : ""}`}
      >
        <PixelPanel tone="wood" pad={0} className="relative z-10" style={{ padding: "calc(var(--p) * 2) calc(var(--p) * 8)" }}>
          <h1 id="home-title" className="text-display text-outline-ink">
            데굴레터
          </h1>
        </PixelPanel>
        {dDayTag && <div className="relative z-20 -mt-[var(--p)]">{dDayTag}</div>}
        <PixelPanel
          tone="wood"
          pad={6}
          className="home-board relative -mt-[calc(var(--p)*4)] flex w-full flex-col items-center gap-[calc(var(--p)*4)]"
          style={{ paddingTop: "calc(var(--p) * 8)" }}
        >
          <span aria-hidden className="home-snowcap" />
          <p className="shrink-0 text-caption text-center leading-[1.6]">
            친구들이 내 마을에 눈사람을 세우고
            <br />
            크리스마스에 열어 볼 편지를 남겨요
          </p>
          <div className="home-board-body">{form}</div>
        </PixelPanel>
        <div aria-hidden className="relative flex w-full justify-between px-[calc(var(--p)*15)]">
          <span className="home-post" />
          <span className="home-post" />
        </div>
        <span aria-hidden className="home-mound" />
      </section>

      {/* 표지판 밖 아래 눈밭: 공용 컴퓨터(PC방 등)에서 다음 사람이 내 마을에 들어오지 못하게 */}
      {loaderDone && mine && loggedIn && (
        <button
          type="button"
          className="home-logout text-label relative z-10 mt-[calc(var(--p)*5)] shrink-0"
          onClick={() => setLogoutOpen(true)}
        >
          <PixelIcon name="houseDoor" scale={2} />
          로그아웃
        </button>
      )}

      {inviting && <InviteLogin variant="page" />}
      <nav style={{ bottom: "calc(var(--p) * 3 + env(safe-area-inset-bottom, 0px))" }} className="text-caption fixed left-1/2 z-30 flex w-max -translate-x-1/2 whitespace-nowrap gap-[calc(var(--p)*2)] bg-paper px-[calc(var(--p)*3)] py-[var(--p)] text-ink">
        <Link href="/privacy">개인정보 처리방침</Link>
        <span aria-hidden>·</span>
        <Link href="/terms">이용 약관</Link>
      </nav>
      {/* 아래 개인정보·약관 링크와 겹치지 않게 그 위로 올린다 */}
      {message && <PixelToast lift={24}>{message}</PixelToast>}
      {logoutOpen && <LogoutConfirm onClose={() => setLogoutOpen(false)} />}
    </main>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useChristmasLabel } from "@/domains/letter";
import { PixelBadge } from "@/shared/components/PixelBadge";
import { PixelButton } from "@/shared/components/PixelButton";
import { PixelField } from "@/shared/components/PixelField";
import { PixelIcon } from "@/shared/components/PixelIcon";
import { PixelPanel } from "@/shared/components/PixelPanel";
import { PixelToast } from "@/shared/components/PixelToast";
import { createVillage, findMyVillage } from "../api";
import { BACKDROP_CARD_TOP } from "../lib/render";
import type { Village } from "../types";
import { HomeBackdrop } from "./HomeBackdrop";

/** 첫 화면: 내 마을이 있으면 들어가기·링크 복사, 없으면 마을 만들기 */
export function HomeScreen() {
  const router = useRouter();
  const [mine, setMine] = useState<Village | null | undefined>(undefined);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  /** 마을로 들어가는 중: 카드가 한 칸 내려가며 사라진다 */
  const [leaving, setLeaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const dday = useChristmasLabel();

  useEffect(() => {
    let alive = true;
    findMyVillage()
      .then((v) => alive && setMine(v))
      .catch((e) => {
        console.error(e);
        if (alive) {
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

  return (
    <main
      className="fixed inset-0 flex flex-col items-center overflow-y-auto bg-ground px-[calc(var(--p)*6)] pb-[calc(var(--p)*6)]"
      style={{ paddingTop: `calc(var(--p) * ${BACKDROP_CARD_TOP})` }}
    >
      <HomeBackdrop />
      <PixelPanel
        as="section"
        aria-labelledby="home-title"
        pad={6}
        className={`relative flex w-full max-w-[360px] shrink-0 flex-col items-center gap-[calc(var(--p)*4)] text-ink ${leaving ? "pixel-leave" : ""}`}
      >
        <h1 id="home-title" className="text-display flex items-center gap-[calc(var(--p)*3)]">
          데굴레터
          <PixelIcon name="star" scale={3} />
        </h1>
        <p className="text-caption -mt-[var(--p)] text-center">친구 마을에 눈사람과 편지를</p>

        {mine === undefined && <p className="text-caption">불러오는 중…</p>}

        {mine && (
          <div className="flex w-full flex-col gap-[calc(var(--p)*4)]">
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
              링크 복사해서 친구 부르기
            </PixelButton>
          </div>
        )}

        {mine === null && (
          <form
            className="flex w-full flex-col gap-[calc(var(--p)*4)]"
            onSubmit={(e) => {
              e.preventDefault();
              void create();
            }}
          >
            <PixelField
              label="내 닉네임"
              value={name}
              maxLength={10}
              autoComplete="nickname"
              onChange={(e) => setName(e.target.value)}
            />
            <PixelButton variant="primary" type="submit" className="w-full" disabled={!name.trim() || busy}>
              {busy ? "만드는 중…" : "마을 만들기"}
            </PixelButton>
          </form>
        )}

        {dday && (
          <PixelBadge tone="gold" icon="star">
            크리스마스 {dday}
          </PixelBadge>
        )}
      </PixelPanel>

      {message && <PixelToast>{message}</PixelToast>}
    </main>
  );
}

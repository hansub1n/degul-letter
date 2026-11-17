"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { HintPill } from "@/shared/components/HintPill";
import { PixelTextButton } from "@/shared/components/PixelTextButton";
import { createVillage, findMyVillage } from "../api";
import type { Village } from "../types";

/** 첫 화면: 내 마을이 있으면 들어가기·링크 복사, 없으면 마을 만들기 */
export function HomeScreen() {
  const router = useRouter();
  const [mine, setMine] = useState<Village | null | undefined>(undefined);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

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
    <main className="fixed inset-0 flex items-center justify-center bg-[#F2F6FB] px-6">
      <div className="pixel-box pixel-box-flat flex w-full max-w-[340px] flex-col items-center gap-4 px-5 py-6 text-ink">
        <h1 className="text-[24px] font-bold leading-none">데굴레터</h1>
        <p className="text-center text-[12px] leading-[1.6]">
          친구들이 내 마을에 눈사람을 세우고
          <br />
          크리스마스에 열어 볼 편지를 남겨요
        </p>

        {mine === undefined && <p className="text-[12px]">불러오는 중…</p>}

        {mine && (
          <div className="flex w-full flex-col gap-3">
            <p className="text-center text-[12px]">{mine.name}의 마을</p>
            <PixelTextButton onClick={() => router.push(`/v/${mine.code}`)}>내 마을 가기</PixelTextButton>
            <PixelTextButton onClick={() => copyLink(mine)}>링크 복사해서 친구 부르기</PixelTextButton>
          </div>
        )}

        {mine === null && (
          <form
            className="flex w-full flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              void create();
            }}
          >
            <input
              value={name}
              maxLength={10}
              onChange={(e) => setName(e.target.value)}
              placeholder="내 닉네임 (예: 얄루얄루)"
              className="pixel-box pixel-box-flat h-11 bg-white px-3 text-[12px] text-ink outline-none"
            />
            <PixelTextButton type="submit" disabled={!name.trim() || busy}>
              {busy ? "만드는 중…" : "마을 만들기"}
            </PixelTextButton>
          </form>
        )}
      </div>

      {message && (
        <HintPill role="status" className="fixed bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
          {message}
        </HintPill>
      )}
    </main>
  );
}

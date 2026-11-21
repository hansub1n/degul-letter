"use client";

import { useEffect, useMemo, useState } from "react";
import { PixelToast } from "@/shared/components/PixelToast";
import type { GuideTarget, VillageGame } from "../lib/engine";

/** 이 브라우저에서 안내를 끝까지 봤는지 (편의용이라 저장이 안 돼도 화면은 그대로 동작) */
const DONE_KEY = "degul-guide-done";
/** 마지막 두 마디(우체통·집)는 이만큼 보여 주고 넘어간다 */
const TALK_MS = 5000;

type Context = { grown: number; stacked: boolean; sculpted: boolean; letterSent: boolean };
/** 화면 위 버튼 중 노란 표시로 짚어 줄 것 (data-guide-spot 값과 같다) */
type Spot = "carve" | "invite" | "home" | "share";
type Step = {
  target: GuideTarget | null;
  /** 짚어 줄 버튼 */
  spot?: Spot;
  /** 데굴이가 하는 말 (\n으로 줄을 나눈다). null이면 조용히 기다린다 (조각·편지 쓰는 동안) */
  say: string | null;
  /** 이 단계를 끝내는 조건. 없으면 TALK_MS 뒤 넘어간다 */
  done?: (c: Context) => boolean;
};

function stepsFor(isOwner: boolean, hasVillage: boolean): Step[] {
  const last: Step = isOwner
    ? { target: null, spot: "share", say: "링크를 보내서\n친구를 초대해 봐!" }
    : hasVillage
      ? { target: null, spot: "home", say: "내 마을에도 놀러 갈까?\n노란 버튼을 눌러 봐" }
      : { target: null, spot: "invite", say: "어때?\n나만의 마을을 만들어 볼래?" };
  return [
    { target: "ball", say: "안녕!\n이 눈덩이를 밀어 볼래?", done: (c) => c.grown >= 1 || c.stacked },
    { target: "ball2", say: "잘했어!\n이번엔 다른 눈덩이도 굴려 보자!", done: (c) => c.grown >= 2 || c.stacked },
    { target: "stack", say: "거의 다 왔어!\n아까 밀었던 눈덩이 쪽으로 계속 밀어 줘!", done: (c) => c.stacked },
    { target: "built", spot: "carve", say: "짜잔! 눈사람이 됐어!\n끌 버튼으로 조각해 볼까?", done: (c) => c.sculpted },
    { target: null, say: null, done: (c) => c.letterSent },
    {
      target: "mailbox",
      say: isOwner
        ? "우체통에서 편지를 모아 보고!\n눈사람을 찾아가면 편지를 하나씩 읽을 수 있어!"
        : "편지 배달 완료!\n주인이 크리스마스에 열어 볼 거야.",
    },
    last,
  ];
}

function readDone(): boolean {
  try {
    return localStorage.getItem(DONE_KEY) === "1";
  } catch {
    return false;
  }
}

function saveDone(): void {
  try {
    localStorage.setItem(DONE_KEY, "1");
  } catch {
    // 저장소를 못 쓰면 다음에 다시 보여 줄 뿐이다
  }
}

type Props = {
  game: () => VillageGame | null;
  isOwner: boolean;
  /** 놀러 온 친구에게 자기 마을이 있는지 (마지막 마디가 달라진다) */
  hasVillage: boolean;
  /** 이 화면에서 조각을 한 번이라도 열었는지 */
  sculpted: boolean;
  /** 이 화면에서 편지를 넣어 눈사람을 세웠는지 */
  letterSent: boolean;
  /** 조각 중에는 숨긴다 */
  hidden: boolean;
};

/**
 * 처음 온 사람 안내. 데굴이(캐릭터)가 머리 위 말풍선으로 말하고, 그 말이 가리키는 물건(눈덩이·눈사람·우체통·집)이
 * 살짝 들썩여서 알려 준다. 깜빡이는 화살표는 쓰지 않는다. 할 일을 해내면 다음 마디로 넘어가고, 끝까지 보면 다시 안 뜬다.
 */
export function DegulGuide({ game, isOwner, hasVillage, sculpted, letterSent, hidden }: Props) {
  const [step, setStep] = useState<number | null>(null);
  const steps = useMemo(() => stepsFor(isOwner, hasVillage), [isOwner, hasVillage]);

  useEffect(() => {
    // 저장소는 브라우저에서만 읽을 수 있어서 한 박자 뒤에 정한다
    const id = window.setTimeout(() => setStep(readDone() ? null : 0), 0);
    return () => window.clearTimeout(id);
  }, []);

  // 할 일을 해냈는지 0.3초마다 보고 넘어간다 (이미 해낸 마디는 건너뛴다)
  useEffect(() => {
    if (step === null || step >= steps.length) return;
    const current = steps[step];
    if (!current.done) {
      const id = window.setTimeout(() => setStep((s) => (s === null ? null : s + 1)), TALK_MS);
      return () => window.clearTimeout(id);
    }
    const timer = window.setInterval(() => {
      const progress = game()?.guideProgress();
      if (!progress) return;
      const c: Context = { ...progress, sculpted, letterSent };
      setStep((s) => {
        let next = s;
        while (next !== null && next < steps.length && steps[next].done?.(c)) next++;
        return next;
      });
    }, 300);
    return () => window.clearInterval(timer);
  }, [step, steps, game, sculpted, letterSent]);

  // 끝까지 보면 기억하고, 마디가 바뀔 때마다 들썩일 물건을 엔진에 알려 준다
  useEffect(() => {
    const finished = step !== null && step >= steps.length;
    if (finished) saveDone();
    const current = step === null || finished ? null : steps[step];
    game()?.setGuide(current?.target ?? null);
    // 짚어 줄 버튼: <html data-guide="carve"> → 그 버튼(data-guide-spot="carve")에 노란 테두리·화살표 (globals.css)
    if (current?.spot) document.documentElement.dataset.guide = current.spot;
    else delete document.documentElement.dataset.guide;
  }, [step, steps, game]);

  useEffect(
    () => () => {
      game()?.setGuide(null);
      delete document.documentElement.dataset.guide;
    },
    [game],
  );

  if (step === null || step >= steps.length) return null;
  const { say } = steps[step];
  return (
    <>
      {say && (
        // 데굴이 머리 위 말풍선. 위치는 엔진이 매 프레임 옮긴다
        <div
          ref={(el) => game()?.setSpeechLayer(el)}
          aria-live="polite"
          className="pointer-events-none absolute left-0 top-0 z-10 opacity-0"
          style={{ visibility: hidden ? "hidden" : undefined }}
        >
          <div key={step} className="speech pixel-rise relative flex flex-col items-center">
            {/* 줄은 문장에서 직접 나눈다 (자동 줄바꿈으로 낱말이 쪼개지지 않게) */}
            <p className="pixel-box text-caption whitespace-pre-line break-keep px-[calc(var(--p)*4)] py-[calc(var(--p)*2)] text-center leading-[1.6] w-max max-w-[calc(100vw-32px)]">
              {say}
            </p>
            {/* 말풍선 꼬리: 데굴이 쪽으로 (발밑으로 내려가면 위쪽에 붙는다) */}
            <span aria-hidden className="speech-tail" />
          </div>
        </div>
      )}
      {step === 0 && !hidden && <PixelToast icon="press">화면을 누른 채 끌면 걸어요 (PC는 방향키)</PixelToast>}
    </>
  );
}

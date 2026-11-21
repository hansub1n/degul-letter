"use client";

import { useEffect, useMemo, useState } from "react";
import { PixelIcon } from "@/shared/components/PixelIcon";
import { PixelToast } from "@/shared/components/PixelToast";
import type { GuideTarget, VillageGame } from "../lib/engine";

/** 조작법 그림은 아래쪽 안내(바닥에서 24px, 높이 약 40px) 바로 위에 간격을 두고 놓는다 */
const CONTROLS_BOTTOM = "calc(env(safe-area-inset-bottom, 0px) + 84px)";

/** 이 브라우저에서 안내를 끝까지 봤는지 (편의용이라 저장이 안 돼도 화면은 그대로 동작) */
const DONE_KEY = "degul-guide-done";
/** 편지를 보낸 뒤 두 마디(우체통·마지막)는 이만큼씩 보여 주고 넘어간다 */
const TALK_MS = 5000;

/** 화면 위 버튼 중 노란 표시로 짚어 줄 것 (data-guide-spot 값과 같다) */
type Spot = "carve" | "write" | "invite" | "home" | "share";
/**
 * 안내 마디. ball~write는 지금 마을 상태로 그때그때 고른다 (눈사람을 부수면 앞 마디로 돌아간다).
 * 편지를 보낸 뒤(mailbox → last)는 차례로 보여 주고 끝낸다.
 */
type Phase = "ball" | "ball2" | "stack" | "built" | "quiet" | "write" | "mailbox" | "last";
type Line = { target: GuideTarget | null; spot?: Spot; say: string | null };

function linesFor(isOwner: boolean, hasVillage: boolean, again: boolean): Record<Phase, Line> {
  return {
    ball: { target: "ball", say: again ? "다시 해 볼까?\n이 눈덩이를 밀어 볼래?" : "안녕!\n이 눈덩이를 밀어 볼래?" },
    ball2: { target: "ball2", say: "잘했어!\n이번엔 다른 눈덩이도 굴려 보자!" },
    stack: { target: "stack", say: "거의 다 왔어!\n아까 밀었던 눈덩이 쪽으로 계속 밀어 줘!" },
    built: { target: "built", spot: "carve", say: "짜잔! 눈사람이 됐어!\n이제 눈사람에 디테일을 더해 볼까?" },
    // 조각하는 동안은 조용히
    quiet: { target: null, say: null },
    write: { target: "write", spot: "write", say: "편지만 남기면 끝이야!\n옆에 뜬 편지 버튼을 눌러 줘!" },
    mailbox: {
      target: "mailbox",
      say: isOwner
        ? "우체통에서 편지를 모아 보고!\n눈사람을 찾아가면 편지를 하나씩 읽을 수 있어!"
        : "편지 배달 완료!\n주인이 크리스마스에 열어 볼 거야.",
    },
    last: isOwner
      ? { target: null, spot: "share", say: "링크를 보내서\n친구를 초대해 봐!" }
      : hasVillage
        ? { target: null, spot: "home", say: "내 마을에도 놀러 갈까?\n노란 버튼을 눌러 봐" }
        : { target: null, spot: "invite", say: "어때?\n나만의 마을을 만들어 볼래?" },
  };
}

/** 안내가 아직 진행 중인지 (끝까지 본 적이 없으면 true). 안내와 겹치는 알림을 뺄 때 쓴다 */
export function isGuideRunning(): boolean {
  return !readDone();
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
  /** 이 화면에서 편지를 넣어 눈사람을 세웠는지 */
  letterSent: boolean;
  /** 조각 중에는 숨긴다 */
  hidden: boolean;
};

/**
 * 처음 온 사람 안내. 데굴이(캐릭터)가 머리 위 말풍선으로 말하고, 그 말이 가리키는 물건(눈덩이·눈사람·우체통·집)이
 * 살짝 들썩여서 알려 준다. 깜빡이는 화살표는 쓰지 않는다. 할 일을 해내면 다음 마디로 넘어가고, 끝까지 보면 다시 안 뜬다.
 */
export function DegulGuide({ game, isOwner, hasVillage, letterSent, hidden }: Props) {
  /** null: 안내 안 함(이미 봤거나 끝남) */
  const [phase, setPhase] = useState<Phase | null>(null);
  /** 첫 마디를 지나간 적이 있는지 (눈사람을 부숴 돌아오면 "안녕" 대신 "다시 해 볼까?") */
  const [again, setAgain] = useState(false);
  /** 한 번이라도 걸었는지. 걷기 전에는 조작법 그림(휴대폰은 조이스틱, PC는 방향키)을 보여 준다 */
  const [walked, setWalked] = useState(false);
  /** 주로 터치로 쓰는 화면인지 (휴대폰·태블릿). 브라우저에서만 알 수 있어서 한 박자 뒤에 정한다 */
  const [touch, setTouch] = useState(false);
  useEffect(() => {
    const id = window.setTimeout(() => {
      setTouch(window.matchMedia("(pointer: coarse)").matches);
      // 저장소도 브라우저에서만 읽을 수 있다
      setPhase(readDone() ? null : "ball");
    }, 0);
    return () => window.clearTimeout(id);
  }, []);
  const lines = useMemo(() => linesFor(isOwner, hasVillage, again), [isOwner, hasVillage, again]);
  const after = phase === "mailbox" || phase === "last";

  // 편지를 보내기 전까지는 0.3초마다 마을 상태를 보고 맞는 마디를 고른다 (앞으로도, 뒤로도)
  useEffect(() => {
    if (phase === null || after) return;
    const timer = window.setInterval(() => {
      const p = game()?.guideProgress();
      if (!p) return;
      if (p.walked) setWalked(true);
      const next: Phase = letterSent
        ? "mailbox"
        : hidden
          ? "quiet"
          : p.finished
            ? "write"
            : p.stacked
              ? "built"
              : p.grown >= 2
                ? "stack"
                : p.grown >= 1
                  ? "ball2"
                  : "ball";
      setPhase((current) => {
        if (current !== null && current !== "ball" && next === "ball") setAgain(true);
        return next;
      });
    }, 300);
    return () => window.clearInterval(timer);
  }, [phase, after, game, letterSent, hidden]);

  // 편지를 보낸 뒤: 우체통 → 마지막 마디를 TALK_MS씩 보여 주고 끝낸다
  useEffect(() => {
    if (!after) return;
    const id = window.setTimeout(() => {
      if (phase === "mailbox") setPhase("last");
      else {
        saveDone();
        setPhase(null);
      }
    }, TALK_MS);
    return () => window.clearTimeout(id);
  }, [phase, after]);

  // 마디가 바뀔 때마다 노랗게 표시할 물건·버튼을 알려 준다
  useEffect(() => {
    const line = phase === null ? null : lines[phase];
    game()?.setGuide(line?.target ?? null);
    // 짚어 줄 버튼: <html data-guide="carve"> → 그 버튼(data-guide-spot="carve")에 노란 테두리·화살표 (globals.css)
    if (line?.spot) document.documentElement.dataset.guide = line.spot;
    else delete document.documentElement.dataset.guide;
  }, [phase, lines, game]);

  useEffect(
    () => () => {
      game()?.setGuide(null);
      delete document.documentElement.dataset.guide;
    },
    [game],
  );

  const skip = () => {
    saveDone();
    setPhase(null);
  };

  if (phase === null) return null;
  const { say } = lines[phase];
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
          <div key={phase} className="speech pixel-rise relative flex flex-col items-center">
            {/* 줄은 문장에서 직접 나눈다 (자동 줄바꿈으로 낱말이 쪼개지지 않게) */}
            <p className="pixel-box text-caption whitespace-pre-line break-keep px-[calc(var(--p)*4)] py-[calc(var(--p)*2)] text-center leading-[1.6] w-max max-w-[calc(100vw-32px)]">
              {say}
            </p>
            {/* 안내가 필요 없으면 ✕로 바로 끈다 (이 브라우저에서 다시 안 뜬다) */}
            <button
              type="button"
              aria-label="안내 끄기"
              onClick={skip}
              className="pixel-box pointer-events-auto absolute -right-[calc(var(--p)*3)] -top-[calc(var(--p)*3)] flex size-[22px] items-center justify-center"
            >
              <PixelIcon name="close" scale={1} />
            </button>
            {/* 말풍선 꼬리: 데굴이 쪽으로 (발밑으로 내려가면 위쪽에 붙는다) */}
            <span aria-hidden className="speech-tail" />
          </div>
        </div>
      )}
      {phase === "ball" && !again && !hidden && !walked && (touch ? <JoystickDemo /> : <ArrowKeysDemo />)}
      {phase === "ball" && !again && !hidden && (
        <PixelToast icon="arrow">{touch ? "화면을 누른 채 끌면 걸어요" : "방향키로 걸어요"}</PixelToast>
      )}
    </>
  );
}

/** 휴대폰: 실제 마을 조이스틱과 똑같은 고리·손잡이 위에 터치 점이 내려앉아 손잡이를 끌고 갔다가 뗀다 */
function JoystickDemo() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 z-30 flex flex-col items-center"
      style={{ bottom: CONTROLS_BOTTOM }}>
      {/* 상자를 고리 크기에 맞추고 키캡 그림자 두께만큼 내려서, 고리 아래 끝이 방향키 아래 끝과 같은 높이에 오게 한다 */}
      <div className="relative size-[100px] translate-y-[7px]">
        <svg viewBox="0 0 100 100" className="absolute inset-0">
          <circle cx="50" cy="50" r="48" fill="none" stroke="var(--snow)" strokeWidth="4" />
          <circle cx="50" cy="50" r="48" fill="none" stroke="var(--ink)" strokeWidth="2" />
        </svg>
        <div className="joystick-demo-knob absolute left-[28px] top-[28px] size-[44px]">
          <svg viewBox="0 0 44 44" className="absolute inset-0">
            <circle cx="22" cy="22" r="21" fill="var(--snow)" stroke="var(--ink)" strokeWidth="2" />
          </svg>
          {/* 손가락이 누른 자리: 반투명 터치 점 */}
          <span className="joystick-demo-touch absolute left-[6px] top-[6px] size-[32px] rounded-full" />
        </div>
      </div>
    </div>
  );
}

/** 키캡 안의 도트 화살표 (위를 가리키는 계단 삼각형을 돌려서 쓴다) */
function KeyArrow({ turn }: { turn: number }) {
  return (
    <svg viewBox="0 0 7 4" width="14" height="8" style={{ transform: `rotate(${turn}deg)` }} shapeRendering="crispEdges">
      <rect x="3" y="0" width="1" height="1" fill="var(--ink)" />
      <rect x="2" y="1" width="3" height="1" fill="var(--ink)" />
      <rect x="1" y="2" width="5" height="1" fill="var(--ink)" />
      <rect x="0" y="3" width="7" height="1" fill="var(--ink)" />
    </svg>
  );
}

/** PC: 도트 방향키 네 개가 하나씩 눌린다 */
function ArrowKeysDemo() {
  const key = (name: string, turn: number) => (
    <span className={`arrow-key arrow-key-${name} pixel-box flex size-[40px] items-center justify-center`}>
      <KeyArrow turn={turn} />
    </span>
  );
  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 z-30 flex flex-col items-center"
      style={{ bottom: CONTROLS_BOTTOM }}>
      <div className="flex flex-col items-center gap-[6px]">
        {key("up", 0)}
        <div className="flex gap-[6px]">
          {key("left", -90)}
          {key("down", 180)}
          {key("right", 90)}
        </div>
      </div>
    </div>
  );
}

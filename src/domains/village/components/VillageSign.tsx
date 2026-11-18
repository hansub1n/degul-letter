"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { christmasLabel } from "@/domains/letter";
import { PixelBadge } from "@/shared/components/PixelBadge";
import { PixelPanel } from "@/shared/components/PixelPanel";
import { PixelToast } from "@/shared/components/PixelToast";

const ENTER_MS = 400;
const HOLD_MS = 1800;
const MOVE_MS = 600;
const FADE_MS = 300;
const STEPS = "steps(8, end)";

type Phase = "intro" | "moving" | "done";

/**
 * 조각 모드에 들어가면 헤더가 내려갔다가 다시 붙는다. 그때 인트로가 처음부터
 * 다시 뜨지 않도록, 이 페이지에서 이미 인트로를 띄운 마을은 이름 판으로 바로 시작한다.
 */
const introShown = new Set<string>();

type Props = {
  name: string;
  subtitle: string;
};

type SignApi = {
  /** 가운데 표지판이 머무는 화면 */
  hold: () => void;
  /** 이동 중간 (0–1, 기본 0.5) */
  middle: (t?: number) => void;
  /** 왼쪽 위 이름 판 */
  end: () => void;
  phase: () => Phase;
};

declare global {
  interface Window {
    __degulVillageSign?: SignApi;
  }
}

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function invertTransform(first: DOMRect, last: DOMRect, scale: boolean): string {
  const dx = first.left - last.left;
  const dy = first.top - last.top;
  if (!scale) return `translate(${dx}px, ${dy}px)`;
  // 가로 기준으로 균등하게 줄여 글자와 나무결이 찌그러지지 않게 한다
  const s = last.width === 0 ? 1 : first.width / last.width;
  return `translate(${dx}px, ${dy}px) scale(${s})`;
}

/**
 * 마을에 들어오면 가운데 큰 표지판이 떴다가, 같은 판이 왼쪽 위 이름 판 자리로
 * 줄어들며 이동한다 (FLIP). 안내 문구는 이동 동안 사라진다. 이름 판은 이동이
 * 끝나기 전에는 따로 그리지 않는다.
 */
export function VillageSign({ name, subtitle }: Props) {
  const [phase, setPhase] = useState<Phase>(() => (introShown.has(name) ? "done" : "intro"));
  /** 처음부터 이름 판으로 붙은 경우 — 인트로 타이머와 페이드인을 건너뛴다 */
  const skipIntro = useRef(phase === "done");
  const reducedRef = useRef(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);
  const infoRef = useRef<HTMLDivElement>(null);
  const firstPanel = useRef<DOMRect | null>(null);
  const firstBadge = useRef<DOMRect | null>(null);
  const firstInfo = useRef<DOMRect | null>(null);
  const timers = useRef<number[]>([]);
  const anims = useRef<Animation[]>([]);
  /** moving 레이아웃으로 바꾼 뒤, 이 진행도에서 멈추거나 재생한다 */
  const seekTo = useRef<number | null>(null);

  const cancelTimers = () => {
    for (const id of timers.current) window.clearTimeout(id);
    timers.current = [];
  };

  const cancelAnims = () => {
    for (const a of anims.current) a.cancel();
    anims.current = [];
  };

  const captureFirst = () => {
    firstPanel.current = panelRef.current?.getBoundingClientRect() ?? null;
    firstBadge.current = badgeRef.current?.getBoundingClientRect() ?? null;
    firstInfo.current = infoRef.current?.getBoundingClientRect() ?? null;
  };

  const playFlip = (from = 0, to = 1, then?: () => void) => {
    const panel = panelRef.current;
    const badge = badgeRef.current;
    const info = infoRef.current;
    const fp = firstPanel.current;
    const fb = firstBadge.current;
    const fi = firstInfo.current;
    if (!panel || !badge || !fp || !fb) {
      then?.();
      return;
    }
    cancelAnims();
    const lastP = panel.getBoundingClientRect();
    const lastB = badge.getBoundingClientRect();
    const panelFrom = invertTransform(fp, lastP, true);
    const badgeFrom = invertTransform(fb, lastB, false);
    const opts = { duration: MOVE_MS, easing: STEPS, fill: "forwards" as const };

    if (info && fi) {
      info.style.position = "fixed";
      info.style.left = `${fi.left}px`;
      info.style.top = `${fi.top}px`;
      info.style.width = `${fi.width}px`;
      info.style.margin = "0";
      info.style.zIndex = "20";
    }

    const run = (el: HTMLElement, start: string) => {
      el.style.transformOrigin = "top left";
      const anim = el.animate([{ transform: start }, { transform: "none" }], opts);
      anims.current.push(anim);
      return anim;
    };
    const panelAnim = run(panel, panelFrom);
    run(badge, badgeFrom);
    if (info) {
      anims.current.push(info.animate([{ opacity: 1 }, { opacity: 0 }], opts));
    }

    const startMs = from * MOVE_MS;
    for (const a of anims.current) {
      a.currentTime = startMs;
    }
    if (from === to) {
      for (const a of anims.current) a.pause();
      return;
    }
    if (to < 1) {
      for (const a of anims.current) a.pause();
      const endMs = to * MOVE_MS;
      for (const a of anims.current) {
        a.play();
        a.currentTime = startMs;
      }
      timers.current.push(
        window.setTimeout(() => {
          for (const a of anims.current) a.pause();
        }, Math.max(0, endMs - startMs)),
      );
      return;
    }
    panelAnim.addEventListener(
      "finish",
      () => {
        if (panelRef.current) panelRef.current.style.transform = "";
        if (badgeRef.current) badgeRef.current.style.transform = "";
        then?.();
      },
      { once: true },
    );
  };

  useEffect(() => {
    reducedRef.current = prefersReducedMotion();
    if (skipIntro.current) return;
    introShown.add(name);
    cancelTimers();
    timers.current.push(
      window.setTimeout(() => {
        if (reducedRef.current) {
          const root = rootRef.current;
          if (!root) {
            setPhase("done");
            return;
          }
          const fade = root.animate([{ opacity: 1 }, { opacity: 0 }], {
            duration: FADE_MS,
            easing: STEPS,
            fill: "forwards",
          });
          anims.current.push(fade);
          fade.addEventListener(
            "finish",
            () => {
              setPhase("done");
            },
            { once: true },
          );
          return;
        }
        captureFirst();
        setPhase("moving");
      }, ENTER_MS + HOLD_MS),
    );
    return () => {
      cancelTimers();
      cancelAnims();
    };
    // 마운트할 때 한 번만 인트로를 시작한다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useLayoutEffect(() => {
    if (phase === "done" && skipIntro.current) return;
    if (phase === "done" && reducedRef.current) {
      const root = rootRef.current;
      if (!root) return;
      root.animate([{ opacity: 0 }, { opacity: 1 }], { duration: FADE_MS, easing: STEPS, fill: "forwards" });
      return;
    }
    if (phase !== "moving") return;
    if (reducedRef.current) {
      setPhase("done");
      return;
    }
    const at = seekTo.current;
    seekTo.current = null;
    if (at != null) {
      playFlip(at, at);
      return;
    }
    playFlip(0, 1, () => setPhase("done"));
    // phase 전환 시에만 재생한다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // playFlip은 매 렌더마다 다시 만들어지지만, 훅 API는 phase만 알면 된다
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const api: SignApi = {
      hold: () => {
        cancelTimers();
        cancelAnims();
        if (panelRef.current) panelRef.current.style.transform = "";
        if (badgeRef.current) badgeRef.current.style.transform = "";
        if (infoRef.current) {
          infoRef.current.style.position = "";
          infoRef.current.style.opacity = "";
        }
        setPhase("intro");
      },
      middle: (t = 0.5) => {
        cancelTimers();
        if (phase === "intro") {
          captureFirst();
          seekTo.current = t;
          setPhase("moving");
          return;
        }
        playFlip(t, t);
      },
      end: () => {
        cancelTimers();
        cancelAnims();
        if (panelRef.current) panelRef.current.style.transform = "";
        if (badgeRef.current) badgeRef.current.style.transform = "";
        setPhase("done");
      },
      phase: () => phase,
    };
    window.__degulVillageSign = api;
    return () => {
      if (window.__degulVillageSign === api) delete window.__degulVillageSign;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const intro = phase === "intro";
  const large = intro;
  const showInfo = phase !== "done";

  return (
    <div
      ref={rootRef}
      data-village-sign={phase}
      className={`village-sign pointer-events-none flex min-w-0 max-w-full flex-col ${
        intro ? "village-sign-intro village-sign-enter items-center" : "items-start"
      }`}
    >
      <div className={`flex flex-col ${intro ? "items-center" : "items-start"}`}>
        <div ref={panelRef} className="village-sign-panel will-change-transform">
          <PixelPanel
            tone="wood"
            pad={0}
            style={{ padding: large ? "calc(var(--p) * 2) calc(var(--p) * 6)" : "calc(var(--p) * 2) calc(var(--p) * 3)" }}
          >
            <p className={`${large ? "text-display" : "text-label"} text-outline-ink ${large ? "" : "truncate"}`}>{name}</p>
          </PixelPanel>
        </div>
        <div ref={badgeRef} className="village-sign-badge will-change-transform">
          <PixelBadge icon="holly" data-twinkle className="relative z-10 -mt-[var(--p)]">
            크리스마스 {christmasLabel()}
          </PixelBadge>
        </div>
      </div>
      {showInfo && (
        <div ref={infoRef} className={intro ? "mt-[calc(var(--p)*5)]" : undefined}>
          <PixelToast placement="inline">{subtitle}</PixelToast>
        </div>
      )}
    </div>
  );
}

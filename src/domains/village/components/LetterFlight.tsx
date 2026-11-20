"use client";

import { useEffect, useRef } from "react";
import { PixelIcon } from "@/shared/components/PixelIcon";

type Props = {
  /** 봉투가 날아갈 화면 위치 (눈사람 몸). 못 찾으면 화면 가운데에서 사라진다 */
  target: () => { x: number; y: number } | null;
  onDone: () => void;
};

/**
 * 편지를 넣으면: 화면 가운데에 봉인된 봉투가 톡 나타났다가, 포물선을 그리며 눈사람 몸으로 날아가 쏙 들어간다.
 * 눈사람 하나 = 편지 한 통이라는 걸 눈으로 보여 주는 연출이다. 조작은 막지 않는다.
 */
export function LetterFlight({ target, onDone }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  // 날아갈 곳·끝났을 때 할 일은 처음 값으로 한 번만 쓴다 (부모가 다시 그려져도 애니메이션을 다시 시작하지 않게)
  const targetRef = useRef(target);
  const doneRef = useRef(onDone);
  useEffect(() => {
    doneRef.current = onDone;
  });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    const to = targetRef.current() ?? { x: cx, y: cy };
    const dx = to.x - cx;
    const dy = to.y - cy;
    // 포물선: 가는 길 중간에 위로 조금 솟는다
    const lift = Math.min(120, Math.abs(dx) * 0.3 + 60);
    const at = (x: number, y: number, s: number, o = 1) => ({
      transform: `translate(-50%, -50%) translate(${x}px, ${y}px) scale(${s})`,
      opacity: o,
    });
    const anim = el.animate(
      reduced
        ? [at(0, 0, 1), at(0, 0, 1, 0)]
        : [
            { ...at(0, 0, 0.5, 0), offset: 0 },
            { ...at(0, 0, 1.15), offset: 0.14 },
            { ...at(0, 0, 1), offset: 0.22 },
            { ...at(0, 0, 1), offset: 0.38 },
            { ...at(dx * 0.5, dy * 0.5 - lift, 0.7), offset: 0.7 },
            { ...at(dx, dy, 0.3), offset: 0.94 },
            { ...at(dx, dy, 0.1, 0), offset: 1 },
          ],
      { duration: reduced ? 400 : 1300, easing: "steps(26, end)", fill: "forwards" },
    );
    anim.onfinish = () => doneRef.current();
    return () => anim.cancel();
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed left-1/2 top-1/2 z-40"
      style={{ transform: "translate(-50%, -50%) scale(0.5)", opacity: 0 }}
    >
      <PixelIcon name="envSealed" scale={4} />
    </div>
  );
}

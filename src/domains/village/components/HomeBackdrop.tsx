"use client";

import { useEffect, useRef } from "react";
import { useTimeOfDay } from "@/shared/hooks/useTimeOfDay";
import { paintBackdrop } from "../lib/render";

/** 홈 배경 배율. 도트 1칸 = --p(3px)라서 카드 여백 계산과 맞는다 */
const SCALE = 3;

/**
 * 홈 뒤에 까는 마을 장면. 마을 엔진은 띄우지 않고 render.ts의 paintBackdrop으로 한 번만 그린다
 * (화면 크기나 낮/밤이 바뀔 때만 다시 그린다). 움직이는 것은 CSS 눈송이 레이어뿐이다.
 */
export function HomeBackdrop() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const time = useTimeOfDay();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || time === null) return;
    let frame = 0;
    const paint = () => {
      const dpr = window.devicePixelRatio || 1;
      const { innerWidth: w, innerHeight: h } = window;
      paintBackdrop(canvas, { width: w * dpr, height: h * dpr, scale: SCALE * dpr });
    };
    const onResize = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(paint);
    };
    paint();
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
    };
  }, [time]);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden bg-ground">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full [image-rendering:pixelated]" />
      <div className="pixel-snowfall pixel-snowfall-far absolute inset-0" />
      <div className="pixel-snowfall pixel-snowfall-near absolute inset-0" />
    </div>
  );
}

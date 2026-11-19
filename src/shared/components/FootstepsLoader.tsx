"use client";

import { useEffect, useRef, useState } from "react";
import { PixelToast } from "@/shared/components/PixelToast";
import { hashInt } from "@/shared/lib/hash";

// 마을을 불러오는 동안의 화면: 눈밭 위에 발자국이 아래에서 위로 찍히고, 가운데 조금 위에 안내 문구가 뜬다.
// 1칸 = 3px(--p). 색은 globals.css 팔레트와 같은 hex (캔버스는 CSS 변수를 못 읽는다).
// 밤 모드는 <html data-time="night">일 때 render.ts / globals.css와 같은 값이다.

const P = 3;
const STEP_GAP = 9; // 발자국 사이 세로 간격(칸)
const SIDE = 3; // 왼발·오른발이 가운데에서 벌어지는 칸
const INTERVAL_MS = 260; // 한 걸음 간격
const LIFE_MS = 3200; // 발자국이 남아 있는 시간
const FADE_MS = 900; // 그중 마지막에 점이 빠지며 사라지는 시간
const SHOW_DELAY_MS = 300; // 이보다 빨리 불러오면 아무것도 보여 주지 않는다

type Rgb = readonly [number, number, number];
type Pal = { ground: Rgb; groundDot: Rgb; glint: Rgb; foot: Record<string, string> };

// 낮: --ground, --ground-dot, --ground-glint, --snow-edge, --path-deep
const PAL_DAY: Pal = {
  ground: [0xdc, 0xe6, 0xf3],
  groundDot: [0xcc, 0xd8, 0xea],
  glint: [0xff, 0xff, 0xff],
  foot: { e: "#A9B8D6", d: "#B8C4DC" },
};
// 밤: --ground, --ground-dot, --ground-glint. 발자국은 밤 눈밭(--ground-dot)과 섞이지 않게
// --ground-shadow·--path보다 한 단계씩 어둡게 칠한다 (그대로 쓰면 위쪽 자국이 배경에 묻힌다)
const PAL_NIGHT: Pal = {
  ground: [0x4a, 0x4f, 0x86],
  groundDot: [0x42, 0x46, 0x7a],
  glint: [0x8e, 0x95, 0xc8],
  foot: { e: "#272957", d: "#313466" },
};

// 왼발 (4x8): 앞꿈치 + 뒤꿈치. e = 위쪽 그늘, d = 눌린 눈
const FOOT = [".ee.", "eddd", "eddd", "dddd", ".dd.", "....", ".ee.", ".dd."];

type Props = {
  /** 화면에 띄우는 안내 문구 */
  label?: string;
  className?: string;
};

export function FootstepsLoader({ label = "마을로 가는 중…", className = "" }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const toastRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  // 짧은 로딩은 숨긴다
  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(true), SHOW_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const pal = document.documentElement.getAttribute("data-time") === "night" ? PAL_NIGHT : PAL_DAY;
    let w = 0;
    let h = 0;
    let ground: ImageData | null = null;

    const resize = () => {
      const nw = Math.floor(window.innerWidth / P);
      const nh = Math.floor(window.innerHeight / P);
      // 폭이나 높이가 0이면(숨겨진 탭, 화면 회전 중) 그리지 않는다: createImageData 오류 방지
      if (nw <= 0 || nh <= 0 || (nw === w && nh === h)) return;
      w = nw;
      h = nh;
      canvas.width = w;
      canvas.height = h;
      canvas.style.width = `${w * P}px`;
      canvas.style.height = `${h * P}px`;
      ground = ctx.createImageData(w, h);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const r = hashInt(x, y);
          const c = r < 0.04 ? pal.groundDot : r > 0.994 ? pal.glint : pal.ground;
          const i = (y * w + x) * 4;
          ground.data[i] = c[0];
          ground.data[i + 1] = c[1];
          ground.data[i + 2] = c[2];
          ground.data[i + 3] = 255;
        }
      }
    };

    // 안내 문구는 화면 아래에 있고, 발자국은 문구 바로 위에서 시작해 위(마을 쪽)로 걸어 올라간다.
    // 문구와 겹치지 않게 몇 칸 여백을 둔다.
    const toastTopY = () => {
      const el = toastRef.current;
      if (!el) return h - 24;
      return Math.floor(el.getBoundingClientRect().top / P) - 26;
    };

    resize();
    window.addEventListener("resize", resize);

    const start = performance.now();
    let raf = 0;

    const drawFoot = (k: number, cx: number, cy: number, fade: number) => {
      FOOT.forEach((row, y) => {
        for (let x = 0; x < row.length; x++) {
          const c = row[x];
          if (c === ".") continue;
          // 오른발은 좌우를 뒤집는다
          const px = k % 2 ? cx + (row.length - 1 - x) : cx + x;
          const py = cy + y;
          if (fade > 0 && hashInt(px, py) < fade) continue;
          ctx.fillStyle = pal.foot[c];
          ctx.fillRect(px, py, 1, 1);
        }
      });
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (!ground || w <= 0) return;
      ctx.putImageData(ground, 0, 0);

      const startY = toastTopY();
      // 발자국은 화면 위쪽 1/4 지점까지만 올라간다
      const count = Math.max(1, Math.floor((startY - Math.round(h * 0.25)) / STEP_GAP) + 1);
      const elapsed = now - start;
      // 발이 4칸이라 기준을 2칸 왼쪽으로, 처음 몇 걸음이 한쪽으로 치우치지 않게 흔들림 위상을 맞춘다
      const footX = (k: number) => Math.round(w / 2 - 2 + Math.sin((k - 3) / 4) * 6 + (k % 2 ? SIDE : -SIDE));

      if (reduced) {
        // 움직임 줄이기: 발자국 여섯 개를 멈춘 채로 보여 준다
        const n = Math.min(6, count);
        for (let k = 0; k < n; k++) drawFoot(k, footX(k), startY - k * STEP_GAP, 0);
      } else {
        const shown = Math.floor(elapsed / INTERVAL_MS);
        for (let i = Math.max(0, shown - Math.ceil(LIFE_MS / INTERVAL_MS)); i <= shown; i++) {
          const age = elapsed - i * INTERVAL_MS;
          if (age > LIFE_MS) continue;
          const k = i % count;
          const fade = age > LIFE_MS - FADE_MS ? (age - (LIFE_MS - FADE_MS)) / FADE_MS : 0;
          drawFoot(k, footX(k), startY - k * STEP_GAP, fade);
        }
      }
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [visible]);

  return (
    <div className={`fixed inset-0 bg-ground ${className}`}>
      {visible && (
        <>
          <canvas ref={canvasRef} aria-hidden className="absolute inset-0 block [image-rendering:pixelated]" />
          <div
            ref={toastRef}
            className="pointer-events-none absolute inset-x-0 bottom-[18%] z-10 flex justify-center px-[calc(var(--p)*6)]"
          >
            <PixelToast placement="inline">{label}</PixelToast>
          </div>
        </>
      )}
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { hashInt } from "@/shared/lib/hash";

// 마을을 불러오는 동안의 화면: 눈밭 위에 발자국이 아래에서 위로 하나씩 찍힌다 (문구 없음).
// 1칸 = 3px(--p). 색은 globals.css 팔레트와 같은 hex (캔버스는 CSS 변수를 못 읽는다).

const P = 3;
const STEP_GAP = 9; // 발자국 사이 세로 간격(칸)
const SIDE = 3; // 왼발·오른발이 가운데에서 벌어지는 칸
const INTERVAL_MS = 260; // 한 걸음 간격
const LIFE_MS = 3200; // 발자국이 남아 있는 시간
const FADE_MS = 900; // 그중 마지막에 점이 빠지며 사라지는 시간
const SHOW_DELAY_MS = 300; // 이보다 빨리 불러오면 아무것도 보여 주지 않는다

const GROUND = [0xdc, 0xe6, 0xf3]; // --ground
const GROUND_DOT = [0xcc, 0xd8, 0xea]; // --ground-dot
const GLINT = [0xff, 0xff, 0xff]; // --ground-glint

// 왼발 (4x8): 앞꿈치 + 뒤꿈치. e = 위쪽 그늘(--snow-edge), d = 눌린 눈(--path-deep)
const FOOT = [".ee.", "eddd", "eddd", "dddd", ".dd.", "....", ".ee.", ".dd."];
const FOOT_COLOR: Record<string, string> = { e: "#A9B8D6", d: "#B8C4DC" };

type Props = {
  /** 화면 읽기 프로그램용 이름 (화면에는 안 보인다) */
  label?: string;
  className?: string;
};

export function FootstepsLoader({ label = "마을로 가는 중", className = "" }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
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
          const c = r < 0.04 ? GROUND_DOT : r > 0.994 ? GLINT : GROUND;
          const i = (y * w + x) * 4;
          ground.data[i] = c[0];
          ground.data[i + 1] = c[1];
          ground.data[i + 2] = c[2];
          ground.data[i + 3] = 255;
        }
      }
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
          ctx.fillStyle = FOOT_COLOR[c];
          ctx.fillRect(px, py, 1, 1);
        }
      });
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (!ground || w <= 0) return;
      ctx.putImageData(ground, 0, 0);

      const startY = h - 24;
      const count = Math.max(1, Math.ceil((startY - 10) / STEP_GAP));
      const elapsed = now - start;
      // 발이 4칸이라 기준을 2칸 왼쪽으로, 처음 몇 걸음이 한쪽으로 치우치지 않게 흔들림 위상을 맞춘다
      const footX = (k: number) => Math.round(w / 2 - 2 + Math.sin((k - 3) / 4) * 6 + (k % 2 ? SIDE : -SIDE));

      if (reduced) {
        // 움직임 줄이기: 발자국 여섯 개를 멈춘 채로 보여 준다
        for (let k = 0; k < 6; k++) drawFoot(k, footX(k), startY - k * STEP_GAP, 0);
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
    <div className={`fixed inset-0 bg-ground ${className}`} role="status" aria-label={label}>
      {visible && <canvas ref={canvasRef} aria-hidden className="absolute inset-0 block [image-rendering:pixelated]" />}
    </div>
  );
}

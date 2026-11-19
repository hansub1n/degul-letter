"use client";

import { useEffect, useRef, useState } from "react";

// 산타 썰매 로딩: 순록 두 마리가 끄는 썰매가 로딩바를 따라 날아간다.
// 진짜 진행률을 알 수 없는 요청(마을 불러오기, 편지 보내기)용이라, 0→90%는 점점 느려지게 가짜로 채우고
// loading이 끝나면 100%를 채운 뒤 썰매가 오른쪽으로 빠져나가고 onFinished를 부른다.
// 1칸 = 3px(--p). 색은 globals.css 팔레트와 같은 hex (캔버스는 CSS 변수를 못 읽어서 따로 적는다).

const P = 3;
const SHOW_DELAY_MS = 300; // 이보다 빨리 끝나면 로딩을 아예 보여 주지 않는다
const FAKE_SECONDS = 3.4; // 이 시간 동안 0→90%
const FILL_SECONDS = 0.25; // 끝난 뒤 90→100%
const EXIT_SECONDS = 0.6; // 100% 뒤 썰매가 빠져나가는 시간

const C: Record<string, string> = {
  k: "#2A2350", // ink: 외곽선, 눈, 발굽
  R: "#C94B42", // roof: 썰매, 산타 옷
  r: "#A63A33", // roof-shade
  L: "#E0706A", // 썰매 윗줄 밝은 빨강
  W: "#FFFFFF", // snow: 수염, 털, 꼬리
  s: "#DCE5F2", // snow-shade
  S: "#A9B8D6", // snow-edge
  y: "#FFC94D", // gold: 장식, 고삐, 방울
  Y: "#D9A032", // gold-shade
  f: "#F7D7BC", // 얼굴
  F: "#E8B996", // 얼굴 그늘
  b: "#C48A55", // 순록 몸
  n: "#EFD3AE", // 순록 배·주둥이
  h: "#F4E4C8", // 뿔
  p: "#8A5A34", // 선물 자루
  P: "#5C3A24", // 자루 그늘
};

// 외곽선을 두르지 않는 칸 (뿔·고삐·방울은 선을 두르면 뭉개진다)
const NO_OUTLINE = new Set(["h", "y"]);

const SLEIGH = [
  "...........W..............",
  "..........RLR.............",
  "..ppp....RRLRR............",
  ".pPppp..WWWWWWW...........",
  ".pppppp.ffffkfF...........",
  ".ppPppp.WsWWWWs...........",
  ".pppppPRWWWWWWWRff........",
  ".ppppppRRRWWWRRRRr......RR",
  "RLLLLLLLLLLLLLLLLLLLLLLRRr",
  "RRRRRRRRRRRRRRRRRRRRRRRRr.",
  "RRRRRyyyRRRRRRRyyyRRRRRr..",
  ".RRRRRRRRRRRRRRRRRRRRrr...",
  "..rrrrrrrrrrrrrrrrrrr.....",
  "...y....y.......y....y....",
  "YyyyyyyyyyyyyyyyyyyyyyyyY.",
  "........................YY",
];

const DEER = [
  "...........h...h.",
  "..........h..h.h.",
  "...........hh.h..",
  "............hh...",
  "...........bbb...",
  "..........bbbbbb.",
  "..........bkbbbbk",
  "...........bnnn..",
  "..........ybb....",
  ".........bbbb....",
  "...bbbbbbbbb.....",
  "WWbbbbbbbbbb.....",
  ".Wbnnnnnbbbb.....",
];

// 다리: 쭉 뻗기(하늘로 뛰어오름) ↔ 배 밑으로 접기
const LEGS_FLY = ["..bb.......bb....", ".bb.........bb...", "bb...........bb..", "kk............kk."];
const LEGS_TUCK = ["...bb...bb.......", "....bb..bb.......", "....kk..kk......."];

const SPRITE_W = 63; // 썰매 + 순록 두 마리 전체 폭(칸)
const SCENE_H = 32;
const BAR_H = 6;

type Cell = [x: number, y: number, c: string];

function pushRows(rows: readonly string[], ox: number, oy: number, out: Cell[]): void {
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) if (row[x] !== ".") out.push([ox + x, oy + y, row[x]]);
  });
}

/** 살짝 처지는 고삐 */
function pushRein(out: Cell[], x1: number, y1: number, x2: number, y2: number): void {
  const len = x2 - x1;
  for (let i = 1; i < len; i++) {
    const y = Math.round(y1 + ((y2 - y1) * i) / len + Math.sin((i / len) * Math.PI) * 1.2);
    out.push([x1 + i, y, "y"]);
  }
}

/** 칸 묶음을 남색 외곽선과 함께 그린다 */
function paintCells(ctx: CanvasRenderingContext2D, cells: Cell[]): void {
  const filled = new Set(cells.map(([x, y]) => `${x},${y}`));
  ctx.fillStyle = C.k;
  for (const [x, y, c] of cells) {
    if (NO_OUTLINE.has(c)) continue;
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      if (!filled.has(`${x + dx},${y + dy}`)) ctx.fillRect(x + dx, y + dy, 1, 1);
    }
  }
  for (const [x, y, c] of cells) {
    ctx.fillStyle = C[c];
    ctx.fillRect(x, y, 1, 1);
  }
}

function drawBar(ctx: CanvasRenderingContext2D, w: number, progress: number): void {
  ctx.clearRect(0, 0, w, BAR_H);
  // 짙은 나무 홈 (모서리 한 칸씩 깎기)
  ctx.fillStyle = C.k;
  ctx.fillRect(1, 0, w - 2, BAR_H);
  ctx.fillRect(0, 1, w, BAR_H - 2);
  ctx.fillStyle = "#3E2716";
  ctx.fillRect(1, 1, w - 2, BAR_H - 2);
  ctx.fillStyle = "#4A2E1C";
  ctx.fillRect(1, BAR_H - 2, w - 2, 1);
  // 차오르는 눈
  const fw = Math.round((w - 2) * progress);
  if (fw > 0) {
    ctx.fillStyle = C.W;
    ctx.fillRect(1, 1, fw, BAR_H - 2);
    ctx.fillStyle = C.S;
    ctx.fillRect(1, BAR_H - 2, fw, 1);
    ctx.fillStyle = C.s;
    for (let i = 1; i < fw; i += 4) ctx.fillRect(i, BAR_H - 3, 1, 1);
  }
  if (progress < 1) {
    ctx.fillStyle = C.y;
    ctx.fillRect(Math.max(1, fw), 1, 1, BAR_H - 2);
  }
}

type Spark = { x: number; y: number; life: number; big: boolean };
type Flake = { x: number; y: number; v: number };

type Props = {
  /** true인 동안 썰매가 날아간다. false가 되면 100%를 채우고 빠져나간다 */
  loading: boolean;
  label?: string;
  doneLabel?: string;
  /** 썰매가 다 빠져나간 뒤 (또는 로딩이 너무 짧아 아예 안 보였을 때) 한 번 부른다 */
  onFinished?: () => void;
  className?: string;
};

export function SantaSleighLoader({
  loading,
  label = "산타가 마을을 찾고 있어요",
  doneLabel = "찾았어요!",
  onFinished,
  className = "",
}: Props) {
  const boxRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLCanvasElement>(null);
  const barRef = useRef<HTMLCanvasElement>(null);
  const loadingRef = useRef(loading);
  const finishedRef = useRef(onFinished);
  const [visible, setVisible] = useState(false);
  const [percent, setPercent] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);
  useEffect(() => {
    finishedRef.current = onFinished;
  }, [onFinished]);

  // 짧은 로딩은 숨긴다: SHOW_DELAY_MS 안에 끝나면 그리지 않고 바로 끝낸다
  useEffect(() => {
    if (visible) return;
    if (!loading) {
      finishedRef.current?.();
      return;
    }
    const timer = window.setTimeout(() => setVisible(true), SHOW_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [loading, visible]);

  useEffect(() => {
    if (!visible) return;
    const box = boxRef.current;
    const scene = sceneRef.current;
    const bar = barRef.current;
    if (!box || !scene || !bar) return;
    const sctx = scene.getContext("2d");
    const bctx = bar.getContext("2d");
    if (!sctx || !bctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0;
    let flakes: Flake[] = [];
    const sparks: Spark[] = [];

    const resize = () => {
      const next = Math.floor(box.clientWidth / P);
      // 폭이 0이면(숨겨진 탭, 화면 회전 중) 캔버스를 만들지 않는다: createImageData/그리기 오류 방지
      if (next <= 0 || next === w) return;
      w = next;
      for (const c of [scene, bar]) {
        c.width = w;
        c.style.width = `${w * P}px`;
      }
      scene.height = SCENE_H;
      scene.style.height = `${SCENE_H * P}px`;
      bar.height = BAR_H;
      bar.style.height = `${BAR_H * P}px`;
      flakes = Array.from({ length: Math.round(w / 7) }, () => ({
        x: Math.random() * w,
        y: Math.random() * SCENE_H,
        v: 2 + Math.random() * 3,
      }));
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(box);

    const start = performance.now();
    let endedAt: number | null = null; // loading이 false가 된 시각
    let endP = 0;
    let raf = 0;
    let lastPercent = -1;

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (w <= 0) return;
      const t = (now - start) / 1000;

      // 진행률
      if (!loadingRef.current && endedAt === null) {
        endedAt = now;
        endP = Math.min(0.9, 0.9 * (1 - Math.pow(1 - Math.min(t / FAKE_SECONDS, 1), 2.2)));
      }
      let p: number;
      let exit = 0;
      if (endedAt === null) {
        p = 0.9 * (1 - Math.pow(1 - Math.min(t / FAKE_SECONDS, 1), 2.2));
      } else {
        const e = (now - endedAt) / 1000;
        p = Math.min(1, endP + ((1 - endP) * e) / FILL_SECONDS);
        if (e > FILL_SECONDS) exit = (e - FILL_SECONDS) / EXIT_SECONDS;
        if (exit >= 1) {
          cancelAnimationFrame(raf);
          finishedRef.current?.();
          return;
        }
      }
      const pct = Math.round(p * 100);
      if (pct !== lastPercent) {
        lastPercent = pct;
        setPercent(pct);
        setDone(p >= 1);
      }
      drawBar(bctx, w, p);

      sctx.clearRect(0, 0, w, SCENE_H);

      // 배경 눈송이
      sctx.fillStyle = "rgba(255,255,255,.55)";
      for (const f of flakes) {
        if (!reduced) {
          f.y += f.v / 60;
          f.x -= 0.15;
          if (f.y > SCENE_H) {
            f.y = -1;
            f.x = Math.random() * w;
          }
          if (f.x < 0) f.x = w;
        }
        sctx.fillRect(Math.round(f.x), Math.round(f.y), 1, 1);
      }

      // 썰매 위치: 진행률을 따라가고, 다 차면 오른쪽으로 빠져나간다. 움직임 줄이기면 가운데 고정
      let x = reduced ? Math.round((w - SPRITE_W) / 2) : Math.round(p * (w - SPRITE_W - 2)) + 1;
      if (exit > 0 && !reduced) x += Math.round(exit * (SPRITE_W + 10));

      // 두 순록은 같은 박자: 뻗을 때 한 칸 떠오르고, 썰매는 반 박자 늦게 출렁인다
      const gal = reduced ? 1 : Math.floor(now / 180) % 2;
      const lift = gal ? -1 : 0;
      const sy = 14 + (gal ? 0 : 1);

      // 반짝이 꼬리
      if (!reduced && p < 1 && Math.floor(now / 70) % 2 === 0) {
        sparks.push({ x: x + Math.random() * 3, y: sy + Math.random() * 5, life: 1, big: Math.random() < 0.25 });
      }
      for (const s of sparks) s.life -= 0.025;
      while (sparks.length && sparks[0].life <= 0) sparks.shift();
      for (const s of sparks) {
        sctx.fillStyle = s.life > 0.6 ? C.y : s.life > 0.3 ? C.h : C.S;
        const sx = Math.round(s.x - (1 - s.life) * 6);
        const syy = Math.round(s.y + (1 - s.life) * 3);
        sctx.fillRect(sx, syy, 1, 1);
        if (s.big && s.life > 0.5) {
          sctx.fillRect(sx - 1, syy, 1, 1);
          sctx.fillRect(sx + 1, syy, 1, 1);
          sctx.fillRect(sx, syy - 1, 1, 1);
          sctx.fillRect(sx, syy + 1, 1, 1);
        }
      }

      const d1x = x + 28;
      const d1y = 10 + lift;
      const d2x = x + 46;
      const d2y = 8 + lift;
      const legs = gal ? LEGS_FLY : LEGS_TUCK;
      const cells: Cell[] = [];
      pushRows(SLEIGH, x, sy, cells);
      pushRein(cells, x + 17, sy + 6, d1x + 10, d1y + 8);
      pushRein(cells, d1x + 11, d1y + 8, d2x + 10, d2y + 8);
      pushRows(DEER, d1x, d1y, cells);
      pushRows(legs, d1x, d1y + 13, cells);
      pushRows(DEER, d2x, d2y, cells);
      pushRows(legs, d2x, d2y + 13, cells);
      paintCells(sctx, cells);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div ref={boxRef} className={`flex w-full flex-col gap-[calc(var(--p)*2)] ${className}`}>
      <canvas ref={sceneRef} aria-hidden className="block [image-rendering:pixelated]" />
      <canvas
        ref={barRef}
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="block [image-rendering:pixelated]"
      />
      <div className="mt-[var(--p)] flex items-center justify-between" aria-live="polite">
        <p className="text-label">{done ? doneLabel : label}</p>
        <p className="text-label">{percent}%</p>
      </div>
    </div>
  );
}

// 길을 잃은 산타 머리 위 물음표 말풍선 (흰 면 + 남색 물음표, 외곽선은 paintCells가 두른다)
const QUESTION = [
  ".WWWWW.",
  "WWkkkWW",
  "WWWWkWW",
  "WWWkkWW",
  "WWWkWWW",
  "WWWWWWW",
  "WWWkWWW",
  ".WWWWW.",
  "..WW...",
  "..W....",
];

const LOST_W = SPRITE_W + 2;
const LOST_H = SCENE_H;

/**
 * 마을을 못 찾은 산타: 로딩 썰매와 같은 그림을 멈춘 채로 그리고, 산타 머리 위에 물음표를 띄운다.
 * 없는 주소·없는 마을·오류 화면에서 쓴다 ("산타가 마을을 찾다가 길을 잃었다").
 */
export function SantaLostArt({ scale = 4, className = "" }: { scale?: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, LOST_W, LOST_H);
    const x = 1;
    const sy = 14;
    const d1x = x + 28;
    const d1y = 10;
    const d2x = x + 46;
    const d2y = 8;
    const cells: Cell[] = [];
    pushRows(SLEIGH, x, sy, cells);
    pushRein(cells, x + 17, sy + 6, d1x + 10, d1y + 8);
    pushRein(cells, d1x + 11, d1y + 8, d2x + 10, d2y + 8);
    pushRows(DEER, d1x, d1y, cells);
    pushRows(LEGS_TUCK, d1x, d1y + 13, cells);
    pushRows(DEER, d2x, d2y, cells);
    pushRows(LEGS_TUCK, d2x, d2y + 13, cells);
    pushRows(QUESTION, x + 12, 1, cells);
    paintCells(ctx, cells);
  }, []);
  return (
    <canvas
      ref={ref}
      aria-hidden
      width={LOST_W}
      height={LOST_H}
      className={`[image-rendering:pixelated] ${className}`}
      style={{ width: LOST_W * scale, height: LOST_H * scale }}
    />
  );
}

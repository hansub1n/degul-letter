// World를 캔버스에 그린다. 작은 도트 캔버스(1칸 = 게임 픽셀 1개)에 그린 뒤 화면 크기로 키워서 또렷한 도트를 유지한다.

import { drawSculpt, type Sculpt } from "@/domains/snowman";
import { clamp, hash2 } from "./geometry";
import type { JoystickView } from "./input";
import { ballHeights, liftPose, popPose } from "./rules";
import type { Direction, Stack, Vec, World } from "./types";
import { HOUSE_POSITION, MAILBOX_POSITION, TREE_POSITIONS } from "./world";

export type HammerPose = "up" | "mid" | "down";

/** 캐릭터가 든 망치. dir은 캐릭터가 바라보며 내리치는 쪽. */
export type HammerView = { pose: HammerPose; dir: Direction };

export type RenderOverlay = {
  joystick: JoystickView | null;
  highlightId: number | null;
  /** 부수기 버튼을 누르고 있는 눈사람과 진행도(0~1) */
  charge: { id: number; progress: number } | null;
  hammer: HammerView | null;
  /** 카메라를 끌어당길 곳. t=0이면 평소(캐릭터 따라가기), t=1이면 완전히 확대 */
  focus: (CameraFocus & { t: number }) | null;
  /** 지금 조각 중인 눈사람. version이 바뀌면 다시 그린다 */
  editing: { stackId: number; sculpt: Sculpt; version: number } | null;
  /** 막 완성한 눈사람의 축하 연출. t는 시작 후 흐른 시간(초) */
  celebrate: { stackId: number; t: number } | null;
  /** 우체통에 모인 편지 수 (0보다 크면 깃발이 올라간다) */
  mailCount: number;
};

/** 완성 축하 연출이 이어지는 시간 */
export const CELEBRATE_SECONDS = 1.6;

const HOP_HEIGHTS = [10, 6, 3];
const HOP_PERIOD = 0.36;
const CONFETTI = ["#E0574F", "#FFC94D", "#3B7660", "#5B7FD8", "#FFFFFF"];

/**
 * 통! 통! 통! 점점 낮아지는 세 번의 뜀.
 * 땅에 닿는 순간은 납작하게(squash), 공중에서는 길쭉하게(stretch) 해서 말랑한 느낌을 준다.
 */
function hopAt(t: number): { h: number; sx: number; sy: number } {
  const i = Math.floor(t / HOP_PERIOD);
  if (t < 0 || i >= HOP_HEIGHTS.length) return { h: 0, sx: 1, sy: 1 };
  const phase = (t - i * HOP_PERIOD) / HOP_PERIOD;
  const h = Math.sin(Math.PI * phase) * HOP_HEIGHTS[i];
  const onGround = phase < 0.12 || phase > 0.88;
  return onGround ? { h, sx: 1.12, sy: 0.88 } : { h, sx: 0.94, sy: 1.06 };
}

/** 화면 가운데에 둘 마을 좌표와 확대 배율(도트 1칸 = scale CSS px) */
export type CameraFocus = { x: number; y: number; scale: number };

/** 화면 가장자리에서 비워 둘 여백 (CSS px). 위아래에 떠 있는 버튼을 피하기 위해 쓴다 */
export type ScreenPad = { top: number; bottom: number; side: number };

export type Renderer = {
  resize(cssWidth: number, cssHeight: number, dpr: number): void;
  paintTrail(x: number, y: number, r: number): void;
  /** 눈사람이 부서지는 연출: 눈가루, 바닥 충격파, 화면 흔들림 */
  burst(x: number, y: number, height: number, r: number): void;
  draw(world: World, overlay: RenderOverlay): void;
  /** 마을의 사각형 영역이 여백 안에 꽉 차게 보이도록 하는 카메라 */
  focusOn(rect: { x: number; y: number; w: number; h: number }, pad: ScreenPad): CameraFocus;
  /** 캔버스 위 CSS 좌표 → 마을 좌표 (마지막으로 그린 카메라 기준) */
  toWorld(cssX: number, cssY: number): Vec;
  /** 마을 좌표 → 캔버스 위 CSS 좌표 (마지막으로 그린 카메라 기준) */
  toScreen(worldX: number, worldY: number): Vec;
  /** 캔버스 크기 (CSS px) */
  size(): { width: number; height: number };
};

type Particle = {
  x: number;
  y: number;
  h: number;
  vx: number;
  vy: number;
  vh: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
};

type Ring = { x: number; y: number; r: number; t: number };

/**
 * 마을 그림의 색. 캔버스는 CSS 변수를 매 프레임 읽을 수 없어서 여기에 같은 hex를 적어 둔다.
 * globals.css와 같은 값 (globals.css의 :root를 바꾸면 여기도 함께 바꾼다)
 */
const PAL = {
  ground: "#DCE6F3",
  groundDot: "#CCD8EA",
  groundGlint: "#FFFFFF",
  path: "#C9D3E6",
  pathDeep: "#B8C4DC",
  groundShadow: "#B8C4DC",
  snow: "#FFFFFF",
  snowShade: "#DCE5F2",
  snowEdge: "#A9B8D6",
  ink: "#2A2350",
  muted: "#7D8BB0",
  roof: "#C94B42",
  roofShade: "#A63A33",
  roofEdge: "#7A2723",
  berry: "#E0574F",
  gold: "#FFC94D",
  goldShade: "#D9A032",
  window: "#FFD27A",
  windowLight: "#FFEBC0",
  pine: "#3B7660",
  pineLight: "#4C8C6E",
  pineShade: "#2E5E4B",
  pineEdge: "#264D3E",
  wood: "#5C3A24",
  woodLight: "#7B4E30",
  woodMid: "#8A5A34",
  wall: "#F4E4C8",
  wallShade: "#E2CCA8",
  heroHat: "#FF8F8F",
  heroHatShade: "#E06C6C",
  heroSkin: "#F7D7BC",
  heroHair: "#4A3428",
  heroCoat: "#6E8EF0",
  heroCoatShade: "#4F6CC8",
  heroScarf: "#FFC24D",
  heroCheek: "#F29A9A",
  heroMouth: "#C0392B",
  // 아래는 그림 전용 색 (globals.css 토큰 없음)
  wallFrame: "#8A6A4A",
  chimney: "#B49C86",
  slate: "#4A5068",
  hammerLight: "#E3E8F3",
  hammerHead: "#B8C2D8",
} as const;

/** "#RRGGBB" → [r, g, b] (땅처럼 픽셀 배열에 직접 쓰는 곳에서 쓴다) */
function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const CRACK = PAL.muted;
const SHAKE_SECONDS = 0.28;

const INK = PAL.ink;
const SNOW_EDGE = PAL.snowEdge;
const SNOW_SHADE = PAL.snowShade;

// ---------- 캔버스 도우미 ----------

function context2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("캔버스 2D 컨텍스트를 만들 수 없어요");
  return ctx;
}

function makeSprite(w: number, h: number, paint: (ctx: CanvasRenderingContext2D) => void): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  paint(context2d(c));
  return c;
}

function rect(ctx: CanvasRenderingContext2D, color: string, x: number, y: number, w: number, h: number): void {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
}

/**
 * 스프라이트 둘레에 1px 외곽선을 두른 새 그림을 만든다. 크기가 (w+2, h+2)가 되므로
 * 그릴 때는 drawOutlined로 (-1, -1) 옮겨서 그려야 원래 발 위치가 그대로다.
 * 비어 있는 칸 중 상하좌우에 칠해진 칸이 있으면 그 색으로 칠한다. (집·나무·우체통만 쓴다)
 */
function outline(sprite: HTMLCanvasElement, color: string): HTMLCanvasElement {
  const w = sprite.width;
  const h = sprite.height;
  const src = context2d(sprite).getImageData(0, 0, w, h).data;
  const hexAt = (x: number, y: number): string | null => {
    if (x < 0 || y < 0 || x >= w || y >= h) return null;
    const i = (y * w + x) * 4;
    if (src[i + 3] === 0) return null;
    return `#${[src[i], src[i + 1], src[i + 2]].map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase()}`;
  };
  return makeSprite(w + 2, h + 2, (ctx) => {
    for (let y = -1; y <= h; y++) {
      for (let x = -1; x <= w; x++) {
        if (hexAt(x, y)) continue;
        const neighbors = [hexAt(x, y + 1), hexAt(x + 1, y), hexAt(x - 1, y), hexAt(x, y - 1)];
        if (neighbors.some(Boolean)) rect(ctx, color, x + 1, y + 1, 1, 1);
      }
    }
    ctx.drawImage(sprite, 1, 1);
  });
}

/** 외곽선을 두른 그림을 원래 그림의 왼쪽 위 (x, y)에 맞춰 그린다 */
function drawOutlined(ctx: CanvasRenderingContext2D, sprite: HTMLCanvasElement, x: number, y: number): void {
  ctx.drawImage(sprite, x - 1, y - 1);
}

function shadow(ctx: CanvasRenderingContext2D, cx: number, cy: number, rw: number): void {
  ctx.fillStyle = PAL.groundShadow;
  const rh = Math.max(1, Math.round(rw * 0.35));
  for (let dy = -rh; dy <= rh; dy++) {
    const w = Math.round(rw * Math.sqrt(1 - (dy * dy) / ((rh + 0.5) * (rh + 0.5))));
    ctx.fillRect(Math.round(cx - w), Math.round(cy + dy), w * 2 + 1, 1);
  }
}

// ---------- 스프라이트 ----------

const ballCache = new Map<string, HTMLCanvasElement>();

/** 눈덩이 도트. 굴린 거리(roll)에 따라 얼룩 무늬가 움직여 굴러가는 느낌을 준다. */
function ballSprite(r: number, roll: number): HTMLCanvasElement {
  const ri = Math.max(2, Math.round(r));
  const phase = Math.floor(roll / 2) % 8;
  const key = `${ri}:${phase}`;
  const cached = ballCache.get(key);
  if (cached) return cached;

  const size = ri * 2 + 1;
  const sprite = makeSprite(size, size, (ctx) => {
    for (let dy = -ri; dy <= ri; dy++) {
      for (let dx = -ri; dx <= ri; dx++) {
        const d2 = dx * dx + dy * dy;
        if (d2 > ri * ri + ri * 0.5) continue;
        let color: string;
        if (d2 > (ri - 1) * (ri - 1) + ri * 0.5 - 1) color = SNOW_EDGE;
        else {
          const light = (-dx * 0.6 - dy * 0.8) / ri;
          color = light > -0.25 ? PAL.snow : SNOW_SHADE;
          if (hash2(dx + phase * 3, dy - phase) < 0.05) color = SNOW_SHADE;
          // 아래쪽 그늘 면의 가장자리 한 줄 더: 바닥과 경계를 분명히 한다 (큰 공은 두 줄)
          const rim = ri >= 6 ? 2 : 1;
          if (dy > ri * 0.35 && light <= -0.25 && d2 > (ri - 1 - rim) * (ri - 1 - rim) + ri * 0.5 - 1) color = SNOW_EDGE;
        }
        rect(ctx, color, dx + ri, dy + ri, 1, 1);
      }
    }
  });
  ballCache.set(key, sprite);
  return sprite;
}

// 그림은 브라우저에서 게임이 시작될 때 만든다 (서버에는 document가 없다)
const makeTreeSprite = () => outline(makeSprite(21, 30, (ctx) => {
  rect(ctx, PAL.wood, 9, 24, 3, 6);
  rect(ctx, PAL.woodLight, 9, 24, 1, 6);
  const center = 10;
  const tiers: Array<[number, number, number]> = [
    [1, 9, 5],
    [7, 9, 7],
    [13, 11, 10],
  ];
  for (const [top, height, half] of tiers) {
    for (let row = 0; row < height; row++) {
      const w = Math.round(((row + 1) / height) * half);
      for (let x = center - w; x <= center + w; x++) {
        const edge = x === center - w || x === center + w;
        let color: string = PAL.pine;
        if (x < center - w / 3) color = PAL.pineLight;
        if (x > center + w / 2) color = PAL.pineShade;
        if (edge || row === height - 1) color = PAL.pineEdge;
        if (row < 2) color = edge ? SNOW_EDGE : PAL.snow;
        // 눈 바로 아랫줄: 녹은 눈이 들쭉날쭉 걸린 줄 (그늘과 테두리 색이 섞인다)
        if (row === 2 && !edge) {
          const m = hash2(x, top);
          if (m < 0.3) color = PAL.snow;
          else if (m < 0.55) color = SNOW_SHADE;
          else if (m < 0.8) color = SNOW_EDGE;
        }
        rect(ctx, color, x, top + row, 1, 1);
      }
    }
  }
}), PAL.ink);

const makeHouseSprite = () => outline(makeSprite(48, 44, (ctx) => {
  // 벽
  rect(ctx, PAL.wallFrame, 5, 20, 38, 24);
  rect(ctx, PAL.wall, 6, 20, 36, 23);
  rect(ctx, PAL.wallShade, 33, 20, 9, 23);
  // 굴뚝
  rect(ctx, PAL.chimney, 33, 1, 5, 10);
  rect(ctx, PAL.snow, 32, 0, 7, 2);
  rect(ctx, SNOW_EDGE, 32, 1, 1, 1);
  rect(ctx, SNOW_EDGE, 38, 1, 1, 1);
  // 지붕 (위쪽은 눈)
  for (let row = 0; row < 19; row++) {
    const inset = Math.round((19 - row) * 1.2);
    for (let x = inset; x < 48 - inset; x++) {
      const edge = x === inset || x === 47 - inset || row === 18;
      let color: string = x > 30 ? PAL.roofShade : PAL.roof;
      if (edge) color = PAL.roofEdge;
      if (row < 6) color = edge ? SNOW_EDGE : PAL.snow;
      // 눈 바로 아랫줄: 녹은 눈이 들쭉날쭉 걸린 줄 (그늘과 테두리 색이 섞인다)
      if (row === 6 && !edge) {
        const m = hash2(x, 3);
        if (m < 0.3) color = PAL.snow;
        else if (m < 0.55) color = SNOW_SHADE;
        else if (m < 0.8) color = SNOW_EDGE;
      }
      rect(ctx, color, x, row + 2, 1, 1);
    }
  }
  // 문
  rect(ctx, PAL.wood, 26, 30, 9, 14);
  rect(ctx, PAL.woodLight, 27, 31, 7, 13);
  rect(ctx, PAL.window, 32, 37, 1, 2);
  // 창문
  rect(ctx, PAL.wallFrame, 10, 26, 11, 9);
  rect(ctx, PAL.window, 11, 27, 9, 7);
  rect(ctx, PAL.windowLight, 11, 27, 4, 3);
  rect(ctx, PAL.wallFrame, 15, 27, 1, 7);
  // 리스
  rect(ctx, PAL.pine, 29, 25, 3, 3);
  rect(ctx, PAL.berry, 30, 28, 1, 1);
}), PAL.ink);

/** 캐릭터 11x13 도트. 가운데 열(5)을 기준으로 좌우 대칭이고, 발 위치가 (5, 12). */
function makePlayerSprite(dir: Direction, step: 0 | 1): HTMLCanvasElement {
  return makeSprite(11, 13, (ctx) => {
    const hat = PAL.heroHat;
    const hatShade = PAL.heroHatShade;
    const skin = PAL.heroSkin;
    const hair = PAL.heroHair;
    const coat = PAL.heroCoat;
    const coatShade = PAL.heroCoatShade;
    const scarf = PAL.heroScarf;

    rect(ctx, PAL.snow, 4, 0, 3, 1);
    rect(ctx, hat, 3, 1, 5, 1);
    rect(ctx, hat, 2, 2, 7, 1);
    rect(ctx, hatShade, 2, 3, 7, 1);

    if (dir === "up") {
      rect(ctx, hair, 2, 4, 7, 3);
    } else {
      rect(ctx, hair, 2, 4, 1, 3);
      rect(ctx, hair, 8, 4, 1, 3);
      rect(ctx, skin, 3, 4, 5, 3);
      const shift = dir === "left" ? -1 : dir === "right" ? 1 : 0;
      if (dir === "left") rect(ctx, hair, 7, 4, 2, 3);
      if (dir === "right") rect(ctx, hair, 2, 4, 2, 3);
      rect(ctx, INK, 4 + shift, 5, 1, 1);
      rect(ctx, INK, 6 + shift, 5, 1, 1);
      rect(ctx, PAL.heroCheek, 3 + shift, 6, 1, 1);
      rect(ctx, PAL.heroCheek, 7 + shift, 6, 1, 1);
    }

    rect(ctx, scarf, 3, 7, 5, 1);
    rect(ctx, coat, 3, 8, 5, 3);
    rect(ctx, coat, 2, 8, 1, 2);
    rect(ctx, coat, 8, 8, 1, 2);
    rect(ctx, coatShade, 3, 11, 5, 1);
    if (step === 0) {
      rect(ctx, INK, 3, 12, 2, 1);
      rect(ctx, INK, 6, 12, 2, 1);
    } else {
      rect(ctx, INK, 2, 12, 2, 1);
      rect(ctx, INK, 7, 12, 2, 1);
    }
  });
}

const PLAYER_COLORS = {
  hat: PAL.heroHat,
  hatShade: PAL.heroHatShade,
  skin: PAL.heroSkin,
  hair: PAL.heroHair,
  coat: PAL.heroCoat,
  coatShade: PAL.heroCoatShade,
  scarf: PAL.heroScarf,
  cheek: PAL.heroCheek,
  mouth: PAL.heroMouth,
};

/** 앞을 보는 얼굴과 모자 (0~6번째 줄). 축하 동작 그림들이 함께 쓴다. 입을 동그랗게 벌린다. */
function paintCheerHead(ctx: CanvasRenderingContext2D): void {
  const c = PLAYER_COLORS;
  rect(ctx, PAL.snow, 4, 0, 3, 1);
  rect(ctx, c.hat, 3, 1, 5, 1);
  rect(ctx, c.hat, 2, 2, 7, 1);
  rect(ctx, c.hatShade, 2, 3, 7, 1);
  rect(ctx, c.hair, 2, 4, 1, 3);
  rect(ctx, c.hair, 8, 4, 1, 3);
  rect(ctx, c.skin, 3, 4, 5, 3);
  rect(ctx, INK, 4, 5, 1, 1);
  rect(ctx, INK, 6, 5, 1, 1);
  rect(ctx, c.cheek, 3, 6, 1, 1);
  rect(ctx, c.cheek, 7, 6, 1, 1);
  rect(ctx, c.mouth, 5, 6, 1, 1);
}

/** 공중: 만세! 두 팔을 머리 위로 들고 다리를 벌린다. 11x13, 발이 맨 아랫줄. */
function makeCheerSprite(): HTMLCanvasElement {
  return makeSprite(11, 13, (ctx) => {
    const c = PLAYER_COLORS;
    paintCheerHead(ctx);
    // 번쩍 든 팔과 손
    rect(ctx, c.coat, 1, 4, 1, 5);
    rect(ctx, c.coat, 9, 4, 1, 5);
    rect(ctx, c.skin, 1, 3, 1, 1);
    rect(ctx, c.skin, 9, 3, 1, 1);
    rect(ctx, c.scarf, 3, 7, 5, 1);
    rect(ctx, c.coat, 2, 8, 7, 3);
    rect(ctx, c.coatShade, 3, 11, 5, 1);
    rect(ctx, INK, 2, 12, 2, 1);
    rect(ctx, INK, 7, 12, 2, 1);
  });
}

/** 땅: 웅크림. 키가 한 칸 작고 몸통이 넓으며 팔을 옆으로 쫙 벌린다. 11x12, 발이 맨 아랫줄. */
function makeCrouchSprite(): HTMLCanvasElement {
  return makeSprite(11, 12, (ctx) => {
    const c = PLAYER_COLORS;
    paintCheerHead(ctx);
    rect(ctx, c.scarf, 3, 7, 5, 1);
    rect(ctx, c.coat, 2, 8, 7, 2);
    rect(ctx, c.coat, 0, 8, 2, 1);
    rect(ctx, c.coat, 9, 8, 2, 1);
    rect(ctx, c.coatShade, 2, 10, 7, 1);
    rect(ctx, INK, 2, 11, 3, 1);
    rect(ctx, INK, 6, 11, 3, 1);
  });
}

const playerSprites = new Map<string, HTMLCanvasElement>();
function playerSprite(dir: Direction, step: 0 | 1): HTMLCanvasElement {
  const key = `${dir}:${step}`;
  let sprite = playerSprites.get(key);
  if (!sprite) {
    sprite = makePlayerSprite(dir, step);
    playerSprites.set(key, sprite);
  }
  return sprite;
}

// ---------- 우체통 ----------

/** 집 옆 빨간 우체통 14x18. 편지가 있으면 봉투가 삐죽 나오고 노란 깃발이 올라간다. 발밑 가운데가 (5, 17). */
function makeMailboxSprite(hasMail: boolean): HTMLCanvasElement {
  return outline(makeSprite(14, 18, (ctx) => {
    if (hasMail) {
      rect(ctx, PAL.slate, 3, 0, 5, 4);
      rect(ctx, PAL.snow, 4, 1, 3, 3);
      rect(ctx, PAL.berry, 5, 2, 1, 1);
    }
    rect(ctx, PAL.roofEdge, 0, 3, 11, 8);
    rect(ctx, PAL.roof, 1, 4, 9, 6);
    rect(ctx, PAL.berry, 2, 4, 4, 1);
    rect(ctx, PAL.roofShade, 9, 4, 1, 6);
    rect(ctx, PAL.roofShade, 1, 9, 9, 1);
    rect(ctx, INK, 2, 6, 7, 1);
    if (hasMail) rect(ctx, PAL.snow, 4, 6, 3, 1);
    // 깃발: 편지가 오면 올라간다
    rect(ctx, PAL.roofEdge, 11, 4, 1, 6);
    rect(ctx, PAL.gold, 12, hasMail ? 4 : 8, 2, 2);
    // 기둥
    rect(ctx, PAL.wood, 4, 11, 3, 7);
    rect(ctx, PAL.woodMid, 5, 11, 1, 6);
  }), PAL.ink);
}

// ---------- 망치 ----------

const HAMMER_PALETTE: Record<string, string> = { o: PAL.slate, l: PAL.hammerLight, h: PAL.hammerHead, w: PAL.woodMid };

/** 오른쪽을 향한 망치 그림과, 손에 쥐는 점(anchor) */
const HAMMER_ROWS: Record<HammerPose, { rows: string[]; anchor: [number, number] }> = {
  up: {
    rows: [
      "ooooooo",
      "ollllho",
      "ohhhhho",
      "ohhhhho",
      "ooooooo",
      "...w...",
      "...w...",
      "...w...",
      "...w...",
      "...w...",
      "...w...",
    ],
    anchor: [3, 10],
  },
  mid: {
    rows: [
      "......oooo",
      "......ollo",
      "......ohho",
      "......oooo",
      ".....w....",
      "....w.....",
      "...w......",
      "..w.......",
      ".w........",
      "w.........",
    ],
    anchor: [0, 9],
  },
  down: {
    rows: [
      "........oooo",
      "........olho",
      "........olho",
      "wwwwwwwwohho",
      "........ohho",
      "........ohho",
      "........oooo",
    ],
    anchor: [0, 3],
  },
};

type HammerShape = { rows: string[]; anchor: [number, number] };
type HammerSprite = { image: HTMLCanvasElement; anchorX: number; anchorY: number };

/** 시계 방향 90도 회전: 오른쪽을 가리키던 망치가 아래를 가리킨다 */
function rotateCW({ rows, anchor }: HammerShape): HammerShape {
  const h = rows.length;
  const w = rows[0].length;
  const out = Array.from({ length: w }, (_, y) => Array.from({ length: h }, (_, x) => rows[h - 1 - x][y]).join(""));
  return { rows: out, anchor: [h - 1 - anchor[1], anchor[0]] };
}

/** 시계 반대 방향 90도 회전: 오른쪽을 가리키던 망치가 위를 가리킨다 */
function rotateCCW({ rows, anchor }: HammerShape): HammerShape {
  const w = rows[0].length;
  const out = Array.from({ length: w }, (_, y) => Array.from({ length: rows.length }, (_, x) => rows[x][w - 1 - y]).join(""));
  return { rows: out, anchor: [anchor[1], w - 1 - anchor[0]] };
}

/** 좌우 뒤집기 */
function mirror({ rows, anchor }: HammerShape): HammerShape {
  const w = rows[0].length;
  return { rows: rows.map((r) => [...r].reverse().join("")), anchor: [w - 1 - anchor[0], anchor[1]] };
}

/** 바라보는 방향별로 "들어 올림 → 휘두름 → 내리침" 모양을 고른다 */
function hammerShape(pose: HammerPose, dir: Direction): HammerShape {
  const base = HAMMER_ROWS[pose];
  switch (dir) {
    case "right":
      return base;
    case "left":
      return mirror(base);
    case "down":
      // 머리 위로 들었다가 발 앞(아래)으로 내리친다
      return pose === "up" ? base : rotateCW(base);
    case "up":
      // 등 뒤(아래)로 젖혔다가 앞(위)으로 내리친다
      if (pose === "up") return rotateCW(HAMMER_ROWS.down);
      if (pose === "mid") return base;
      return rotateCCW(base);
  }
}

function makeHammerSprite(pose: HammerPose, dir: Direction): HammerSprite {
  const { rows, anchor } = hammerShape(pose, dir);
  const w = rows[0].length;
  const image = makeSprite(w, rows.length, (ctx) => {
    rows.forEach((row, y) => {
      for (let x = 0; x < w; x++) {
        const color = HAMMER_PALETTE[row[x]];
        if (color) rect(ctx, color, x, y, 1, 1);
      }
    });
  });
  return { image, anchorX: anchor[0], anchorY: anchor[1] };
}

/** 망치를 쥔 손 위치 (캐릭터 발 기준) */
const HAND_OFFSET: Record<Direction, Vec> = {
  right: { x: 4, y: -3 },
  left: { x: -4, y: -3 },
  down: { x: 3, y: -3 },
  up: { x: 3, y: -4 },
};

/** 망치가 내리쳐지는 자리 (캐릭터 발 기준, h는 높이) */
const STRIKE_OFFSET: Record<Direction, Vec & { h: number }> = {
  right: { x: 14, y: 0, h: 3 },
  left: { x: -14, y: 0, h: 3 },
  down: { x: 3, y: 9, h: 0 },
  up: { x: 3, y: -4, h: 12 },
};

// ---------- 땅 ----------

function makeGround(width: number, height: number): HTMLCanvasElement {
  return makeSprite(width, height, (ctx) => {
    const img = ctx.createImageData(width, height);
    const data = img.data;
    const base = rgb(PAL.ground);
    const dot = rgb(PAL.groundDot);
    const glint = rgb(PAL.groundGlint);
    const path = rgb(PAL.path);
    const pathDeep = rgb(PAL.pathDeep);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const h = hash2(x, y);
        let c = base;
        if (h < 0.04) c = dot;
        else if (h > 0.994) c = glint;
        // 집 앞에서 아래로 이어지는 발자국 길
        const pathX = HOUSE_POSITION.x + Math.sin(y / 28) * 12;
        if (y > HOUSE_POSITION.y && Math.abs(x - pathX) < 6 + Math.sin(y / 9)) {
          c = h < 0.5 ? path : pathDeep;
        }
        const i = (y * width + x) * 4;
        data[i] = c[0];
        data[i + 1] = c[1];
        data[i + 2] = c[2];
        data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  });
}

// ---------- 렌더러 ----------

type Flake = { x: number; y: number; speed: number; size: number };

export function createRenderer(canvas: HTMLCanvasElement, worldWidth: number, worldHeight: number): Renderer {
  const screen = context2d(canvas);
  const pixel = document.createElement("canvas");
  const px = context2d(pixel);
  const ground = makeGround(worldWidth, worldHeight);
  const groundCtx = context2d(ground);
  const treeSprite = makeTreeSprite();
  const houseSprite = makeHouseSprite();
  const cheerSprite = makeCheerSprite();
  const mailboxEmpty = makeMailboxSprite(false);
  const mailboxFull = makeMailboxSprite(true);
  const crouchSprite = makeCrouchSprite();

  const hammerSprites = new Map<string, HammerSprite>();
  for (const pose of ["up", "mid", "down"] as const) {
    for (const dir of ["left", "right", "up", "down"] as const) hammerSprites.set(`${pose}:${dir}`, makeHammerSprite(pose, dir));
  }
  let lastHammerPose: HammerPose | null = null;
  let lastCelebrateId: number | null = null;
  // 캔버스 글자에 쓸 도트 글꼴 이름 (next/font가 만든 이름을 CSS 변수에서 읽는다)
  const pixelFont =
    getComputedStyle(document.documentElement).getPropertyValue("--font-pixel").trim() || "sans-serif";

  // 조각 그림은 바뀔 때(version)만 다시 그리고, 그 외에는 만들어 둔 그림을 다시 쓴다
  const sculptSprites = new Map<number, { source: Sculpt; version: number; image: HTMLCanvasElement }>();
  function sculptSprite(id: number, sculpt: Sculpt, version = 0): HTMLCanvasElement {
    const cached = sculptSprites.get(id);
    if (cached && cached.source === sculpt && cached.version === version) return cached.image;
    const image = makeSprite(sculpt.width, sculpt.height, (ctx) => drawSculpt(ctx, sculpt, 0, 0, 1));
    sculptSprites.set(id, { source: sculpt, version, image });
    return image;
  }

  const flakes: Flake[] = Array.from({ length: 70 }, () => ({
    x: Math.random(),
    y: Math.random(),
    speed: 8 + Math.random() * 14,
    size: Math.random() < 0.2 ? 2 : 1,
  }));

  let dpr = 1;
  let cssW = 0;
  let cssH = 0;
  /** 평소 배율. 확대 중에는 그리는 프레임마다 배율을 따로 계산한다 */
  let baseScale = 3;
  let lastCam = { x: 0, y: 0, scale: 3 };

  const particles: Particle[] = [];
  const rings: Ring[] = [];
  let shakeTime = 0;
  let shakePower = 0;
  let lastTime: number | null = null;

  function burst(x: number, y: number, height: number, r: number): void {
    const count = Math.round(40 + r * 3);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 30 + Math.random() * 80;
      particles.push({
        x: x + Math.cos(angle) * r * 0.5 * Math.random(),
        y: y + Math.sin(angle) * r * 0.3 * Math.random(),
        h: Math.random() * height,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed * 0.5,
        vh: 20 + Math.random() * 100,
        life: 0,
        maxLife: 0.6 + Math.random() * 0.7,
        size: Math.random() < 0.5 ? 2 : 1,
        color: Math.random() < 0.25 ? SNOW_SHADE : PAL.snow,
      });
    }
    rings.push({ x, y, r, t: 0 });
    shakeTime = SHAKE_SECONDS;
    shakePower = Math.min(4, 1.5 + r * 0.12);
  }

  /** 완성 축하 색종이: 머리 위에서 위로 팡 터졌다가 떨어진다 */
  function confetti(x: number, y: number, height: number): void {
    for (let i = 0; i < 46; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 20 + Math.random() * 50;
      particles.push({
        x,
        y,
        h: height,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed * 0.4,
        vh: 60 + Math.random() * 90,
        life: 0,
        maxLife: 1 + Math.random() * 0.6,
        size: Math.random() < 0.5 ? 2 : 1,
        color: CONFETTI[i % CONFETTI.length],
      });
    }
  }

  /** 망치가 눈사람을 칠 때마다 튀는 작은 눈가루와 살짝 흔들림 */
  function puff(x: number, y: number, h: number): void {
    for (let i = 0; i < 10; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 15 + Math.random() * 35;
      particles.push({
        x,
        y,
        h,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed * 0.4,
        vh: 20 + Math.random() * 50,
        life: 0,
        maxLife: 0.3 + Math.random() * 0.3,
        size: Math.random() < 0.4 ? 2 : 1,
        color: PAL.snow,
      });
    }
    if (shakeTime < 0.1) {
      shakeTime = 0.1;
      shakePower = 1;
    }
  }

  function updateEffects(dt: number): void {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life += dt;
      p.vh -= 240 * dt;
      p.h += p.vh * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.h <= 0) {
        p.h = 0;
        p.vh *= -0.25;
        p.vx *= 0.5;
        p.vy *= 0.5;
      }
      if (p.life >= p.maxLife) particles.splice(i, 1);
    }
    for (let i = rings.length - 1; i >= 0; i--) {
      rings[i].t += dt / 0.35;
      if (rings[i].t >= 1) rings.splice(i, 1);
    }
    if (shakeTime > 0) shakeTime = Math.max(0, shakeTime - dt);
  }

  function resize(cssWidth: number, cssHeight: number, nextDpr: number): void {
    dpr = nextDpr;
    cssW = cssWidth;
    cssH = cssHeight;
    canvas.width = Math.round(cssWidth * dpr);
    canvas.height = Math.round(cssHeight * dpr);
    baseScale = Math.max(2, Math.round(Math.min(cssWidth / 220, cssHeight / 280)));
  }

  function focusOn(rect: { x: number; y: number; w: number; h: number }, pad: ScreenPad): CameraFocus {
    const fit = Math.min((cssW - pad.side * 2) / rect.w, (cssH - pad.top - pad.bottom) / rect.h);
    const scale = Math.max(baseScale, Math.floor(fit));
    // 버튼을 피한 빈 공간의 가운데에 영역 가운데가 오도록, 화면 가운데에 둘 지점을 옮긴다
    const zoneCenterY = (pad.top + cssH - pad.bottom) / 2;
    return {
      x: rect.x + rect.w / 2,
      y: rect.y + rect.h / 2 + (cssH / 2 - zoneCenterY) / scale,
      scale,
    };
  }

  function toWorld(x: number, y: number): Vec {
    return { x: lastCam.x + x / lastCam.scale, y: lastCam.y + y / lastCam.scale };
  }

  function toScreen(x: number, y: number): Vec {
    return { x: (x - lastCam.x) * lastCam.scale, y: (y - lastCam.y) * lastCam.scale };
  }

  function paintTrail(x: number, y: number, r: number): void {
    const rr = Math.max(2, r * 0.6);
    const rh = Math.ceil(rr * 0.5);
    groundCtx.fillStyle = PAL.pathDeep;
    for (let dy = -rh; dy <= rh; dy++) {
      const w = Math.round(rr * Math.sqrt(Math.max(0, 1 - (dy * dy) / ((rh + 0.5) * (rh + 0.5)))));
      groundCtx.fillRect(Math.round(x - w), Math.round(y + dy), w * 2 + 1, 1);
    }
  }

  /** 금 간 자국: 공 윗부분에서 아래로 지그재그로 내려간다 */
  function drawCrack(cx: number, cy: number, r: number, amount: number, seed: number): void {
    const length = Math.round(r * 1.3 * amount);
    let x = Math.round(cx - r * 0.25 + (hash2(seed, 1) - 0.5) * r * 0.4);
    let y = Math.round(cy - r * 0.7);
    for (let i = 0; i < length; i++) {
      rect(px, CRACK, x, y, 1, 1);
      y += 1;
      if (hash2(seed, i) < 0.5) x += hash2(i, seed) < 0.5 ? -1 : 1;
    }
  }

  function drawStack(
    stack: Stack,
    camX: number,
    camY: number,
    time: number,
    highlighted: boolean,
    charge: number,
    editing: RenderOverlay["editing"],
  ): void {
    const pose = popPose(stack);
    if (pose) {
      shadow(px, pose.x - camX, pose.y - camY, pose.r * 0.8);
      const sprite = ballSprite(pose.r, stack.balls[0].roll + time * 30);
      const half = (sprite.width - 1) / 2;
      px.drawImage(sprite, Math.round(pose.x - camX - half), Math.round(pose.y - camY - pose.h - half));
      return;
    }

    const sx = stack.x - camX;
    const sy = stack.y - camY;
    const n = stack.balls.length;
    const heights = ballHeights(stack);

    if (highlighted) {
      const rr = stack.balls[0].r + 3;
      const ry = Math.max(2, Math.round(rr * 0.4));
      px.fillStyle = PAL.gold;
      for (let a = 0; a < 40; a++) {
        if (a % 2) continue;
        const an = (a / 40) * Math.PI * 2 + time;
        px.fillRect(Math.round(sx + Math.cos(an) * rr), Math.round(sy + Math.sin(an) * ry), 1, 1);
      }
    }

    shadow(px, sx, sy, stack.balls[0].r * 0.95);

    // 조각한(또는 조각 중인) 눈사람: 조각 1칸이 마을의 1픽셀이라 그대로 세운다
    const live = editing?.stackId === stack.id ? editing : null;
    const sculpt = live?.sculpt ?? stack.sculpt;
    if (sculpt) {
      const sprite = sculptSprite(stack.id, sculpt, live?.version ?? 0);
      const tremble = charge > 0 ? Math.round(Math.sin(time * 55) * (0.6 + charge * 1.6)) : 0;
      const sway = live ? 0 : Math.round(Math.sin(time * 8 + stack.id) * stack.wobble * 2) + tremble;
      px.drawImage(sprite, Math.round(sx - sculpt.originX) + sway, Math.round(sy - (sculpt.height - 1)));
      // 망치질하는 동안에는 조각한 눈사람에도 아래 덩어리부터 금이 간다
      stack.balls.forEach((ball, i) => {
        const crackStart = 0.15 + i * 0.2;
        if (charge > crackStart) {
          drawCrack(Math.round(sx + sway), Math.round(sy - heights[i]), ball.r, Math.min(1, (charge - crackStart) * 3), stack.id * 7 + i);
        }
      });
      return;
    }

    stack.balls.forEach((ball, i) => {
      const lean = n > 1 ? i / (n - 1) : 0;
      const tremble = charge > 0 ? Math.round(Math.sin(time * 55 + i * 2) * (0.6 + charge * 1.6)) : 0;
      const sway = Math.round(Math.sin(time * 8 + stack.id) * stack.wobble * 5 * lean) + tremble;
      const sprite = ballSprite(ball.r, ball.roll);
      const half = (sprite.width - 1) / 2;
      const by = Math.round(sy - heights[i]);
      px.drawImage(sprite, Math.round(sx + sway - half), by - half);
      // 오래 누를수록 아래 공부터 차례로 금이 간다
      const crackStart = 0.15 + i * 0.2;
      if (charge > crackStart) {
        drawCrack(Math.round(sx + sway), by, ball.r, Math.min(1, (charge - crackStart) * 3), stack.id * 7 + i);
      }
    });
  }

  function draw(world: World, overlay: RenderOverlay): void {
    if (cssW === 0) return;
    const { player, time } = world;
    const dt = lastTime === null ? 0 : Math.max(0, time - lastTime);
    lastTime = time;
    updateEffects(dt);

    // 카메라: 평소에는 캐릭터를 따라가고, focus가 있으면 그쪽으로 확대하며 끌려간다
    const focus = overlay.focus;
    const t = focus ? focus.t : 0;
    const scale = focus ? baseScale + (focus.scale - baseScale) * t : baseScale;
    const viewW = cssW / scale;
    const viewH = cssH / scale;
    const baseW = cssW / baseScale;
    const baseH = cssH / baseScale;
    let centerX = worldWidth < baseW ? worldWidth / 2 : clamp(player.x, baseW / 2, worldWidth - baseW / 2);
    let centerY = worldHeight < baseH ? worldHeight / 2 : clamp(player.y, baseH / 2, worldHeight - baseH / 2);
    if (focus) {
      centerX += (focus.x - centerX) * t;
      centerY += (focus.y - centerY) * t;
    }
    let camX = Math.round(centerX - viewW / 2);
    let camY = Math.round(centerY - viewH / 2);
    const pw = Math.ceil(viewW) + 1;
    const ph = Math.ceil(viewH) + 1;
    if (pixel.width !== pw) pixel.width = pw;
    if (pixel.height !== ph) pixel.height = ph;
    if (shakeTime > 0) {
      const amount = shakePower * (shakeTime / SHAKE_SECONDS);
      camX += Math.round((Math.random() * 2 - 1) * amount);
      camY += Math.round((Math.random() * 2 - 1) * amount);
    }

    lastCam = { x: camX, y: camY, scale };
    // 캔버스 크기를 바꾸면 설정이 초기화되니 매번 다시 끈다 (늘이고 줄일 때 도트가 번지지 않게)
    px.imageSmoothingEnabled = false;

    // 완성 축하: 캐릭터가 방방 뛴다. 처음 시작하는 프레임에 한 번 캐릭터 머리 위로 색종이를 터뜨린다
    const celebrate = overlay.celebrate;
    if (celebrate && lastCelebrateId !== celebrate.stackId) {
      lastCelebrateId = celebrate.stackId;
      confetti(player.x, player.y, 16);
    }
    if (!celebrate) lastCelebrateId = null;
    const hop = celebrate ? hopAt(celebrate.t) : { h: 0, sx: 1, sy: 1 };

    rect(px, PAL.path, 0, 0, pw, ph);
    px.drawImage(ground, -camX, -camY);

    // 아래쪽(y가 큰) 것이 앞에 오도록 y 순서로 그린다
    const layers: Array<{ y: number; paint: () => void }> = [];
    layers.push({
      y: HOUSE_POSITION.y,
      paint: () => drawOutlined(px, houseSprite, Math.round(HOUSE_POSITION.x - 24 - camX), Math.round(HOUSE_POSITION.y - 43 - camY)),
    });
    for (const [tx, ty] of TREE_POSITIONS) {
      layers.push({ y: ty, paint: () => drawOutlined(px, treeSprite, Math.round(tx - 10 - camX), Math.round(ty - 29 - camY)) });
    }
    layers.push({
      y: MAILBOX_POSITION.y,
      paint: () => {
        shadow(px, MAILBOX_POSITION.x - camX, MAILBOX_POSITION.y - camY, 4);
        const sprite = overlay.mailCount > 0 ? mailboxFull : mailboxEmpty;
        drawOutlined(px, sprite, Math.round(MAILBOX_POSITION.x - 5 - camX), Math.round(MAILBOX_POSITION.y - 17 - camY));
      },
    });
    for (const stack of world.stacks) {
      const charge = overlay.charge?.id === stack.id ? overlay.charge.progress : 0;
      layers.push({
        y: popPose(stack)?.y ?? stack.y,
        paint: () =>
          drawStack(
            stack,
            camX,
            camY,
            time,
            stack.id === overlay.highlightId,
            charge,
            overlay.editing,
          ),
      });
    }
    const lift = liftPose(world);
    if (lift) {
      layers.push({
        y: lift.y + 0.5,
        paint: () => {
          shadow(px, lift.x - camX, lift.y - camY, lift.ball.r * 0.8);
          const sprite = ballSprite(lift.ball.r, lift.ball.roll + time * 20);
          const half = (sprite.width - 1) / 2;
          px.drawImage(sprite, Math.round(lift.x - camX - half), Math.round(lift.y - camY - lift.h - half));
        },
      });
    }
    const paintPlayer = () => {
      const step: 0 | 1 = player.walking && Math.floor(player.walkTime * 7) % 2 === 1 ? 1 : 0;
      // 방방 뛸 때는 따로 그린 축하 동작을 쓴다: 공중에선 만세, 땅에 닿을 땐 웅크림.
      // (그림을 늘이면 도트가 빠져 눈이 사라지므로 늘이지 않는다)
      const left = Math.round(player.x - 5 - camX);
      const feet = Math.round(player.y - camY - step - hop.h); // 맨 아랫줄(발)이 그려질 y
      const cheering = celebrate !== null && hop.sy !== 1;
      const sprite = !cheering ? playerSprite(player.dir, step) : hop.sy < 1 ? crouchSprite : cheerSprite;
      // 맨 아랫줄(발)이 feet에 오도록 그림 키만큼 올려서 그린다
      px.drawImage(sprite, left, feet - (sprite.height - 1));
      const hammer = overlay.hammer;
      if (hammer) {
        const sprite = hammerSprites.get(`${hammer.pose}:${hammer.dir}`);
        const hand = HAND_OFFSET[hammer.dir];
        const handX = Math.round(player.x + hand.x - camX);
        const handY = Math.round(player.y + hand.y - camY);
        if (sprite) px.drawImage(sprite.image, handX - sprite.anchorX, handY - sprite.anchorY);
      }
    };
    layers.push({
      y: player.y,
      paint: () => {
        // 뛰어오르면 그림자가 작아진다
        shadow(px, player.x - camX, player.y - camY, hop.h > 4 ? 3 : 5);
        paintPlayer();
      },
    });

    // 망치가 내려오는 순간마다 칠 자리에서 눈가루가 튄다
    const pose = overlay.hammer?.pose ?? null;
    if (pose === "down" && lastHammerPose !== "down" && overlay.hammer && overlay.charge) {
      const strike = STRIKE_OFFSET[overlay.hammer.dir];
      puff(player.x + strike.x, player.y + strike.y, strike.h);
    }
    lastHammerPose = pose;
    // 바닥 충격파: 부서진 자리에서 퍼지는 눈 고리
    for (const ring of rings) {
      const rr = ring.r + ring.t * 22;
      const ry = Math.max(2, rr * 0.4);
      px.globalAlpha = 1 - ring.t;
      px.fillStyle = SNOW_EDGE;
      for (let a = 0; a < 48; a++) {
        const an = (a / 48) * Math.PI * 2;
        px.fillRect(Math.round(ring.x - camX + Math.cos(an) * rr), Math.round(ring.y - camY + Math.sin(an) * ry), 1, 1);
      }
      px.globalAlpha = 1;
    }

    layers.sort((a, b) => a.y - b.y);
    for (const layer of layers) layer.paint();

    // 눈사람이나 나무 뒤에 가려져도 캐릭터가 비쳐 보이게 한 번 더 반투명하게 그린다.
    // 가려지지 않았을 때는 같은 그림 위에 겹쳐 그리는 것이라 차이가 없다.
    px.globalAlpha = 0.4;
    paintPlayer();
    px.globalAlpha = 1;

    // 눈가루: 흰 바닥 위에서도 보이도록 아래쪽에 푸른 그늘 한 줄을 붙인다
    for (const p of particles) {
      px.globalAlpha = Math.min(1, (1 - p.life / p.maxLife) * 2);
      const x = Math.round(p.x - camX);
      const y = Math.round(p.y - camY - p.h);
      px.fillStyle = SNOW_EDGE;
      px.fillRect(x, y + 1, p.size, p.size);
      px.fillStyle = p.color;
      px.fillRect(x, y, p.size, p.size);
    }
    px.globalAlpha = 1;

    // 내리는 눈
    px.fillStyle = "rgba(255,255,255,0.9)";
    for (const f of flakes) {
      const y = (f.y + (time * f.speed) / 240) % 1.04;
      const x = f.x + Math.sin(time + f.speed) * 0.01;
      px.fillRect(Math.round(x * viewW), Math.round(y * viewH - 0.02 * viewH), f.size, f.size);
    }

    // 작은 도트 캔버스를 화면 크기로 키워서 옮긴다
    screen.setTransform(1, 0, 0, 1, 0, 0);
    screen.imageSmoothingEnabled = false;
    screen.drawImage(pixel, 0, 0, pw, ph, 0, 0, pw * scale * dpr, ph * scale * dpr);

    // 저장된 눈사람 발밑에 만든 사람 이름표 (조각하느라 확대 중일 때는 숨긴다)
    if (t < 0.05) {
      screen.setTransform(dpr, 0, 0, dpr, 0, 0);
      screen.font = `bold 12px ${pixelFont}`;
      screen.textAlign = "center";
      screen.textBaseline = "top";
      screen.lineJoin = "round";
      screen.lineWidth = 4;
      for (const stack of world.stacks) {
        if (!stack.saved || stack.pop) continue;
        const p = toScreen(stack.x, stack.y + 3);
        const label = stack.saved.authorName;
        screen.strokeStyle = PAL.snow;
        screen.strokeText(label, Math.round(p.x), Math.round(p.y));
        screen.fillStyle = INK;
        screen.fillText(label, Math.round(p.x), Math.round(p.y));
      }
    }

    // "완성!" 글자: 캐릭터 머리 위에서 뿅 커졌다가 제자리, 살짝 떠오르며 사라진다
    if (celebrate && celebrate.t < CELEBRATE_SECONDS) {
      const ct = celebrate.t;
      const size = ct < 0.06 ? 12 : ct < 0.14 ? 36 : 24;
      const rise = Math.round(Math.min(ct, 1) * 6);
      const p = toScreen(player.x, player.y - 13 - HOP_HEIGHTS[0] - 4);
      screen.setTransform(dpr, 0, 0, dpr, 0, 0);
      screen.globalAlpha = ct > CELEBRATE_SECONDS - 0.3 ? (CELEBRATE_SECONDS - ct) / 0.3 : 1;
      screen.font = `bold ${size}px ${pixelFont}`;
      screen.textAlign = "center";
      screen.textBaseline = "bottom";
      screen.lineJoin = "miter";
      screen.lineWidth = 6;
      screen.strokeStyle = INK;
      screen.strokeText("완성!", Math.round(p.x), Math.round(p.y - rise));
      screen.fillStyle = PAL.gold;
      screen.fillText("완성!", Math.round(p.x), Math.round(p.y - rise));
      screen.globalAlpha = 1;
    }

    // 조각 중이면 조각할 수 있는 범위를 네 귀퉁이 꺾쇠로 표시한다 (확대가 거의 끝났을 때만)
    const editStack = overlay.editing && world.stacks.find((s) => s.id === overlay.editing?.stackId);
    if (overlay.editing && editStack && t > 0.6) {
      const sc = overlay.editing.sculpt;
      const left = (Math.round(editStack.x - sc.originX) - camX) * scale;
      const top = (Math.round(editStack.y - (sc.height - 1)) - camY) * scale;
      const right = left + sc.width * scale;
      const bottom = top + sc.height * scale;
      const thick = 3;
      const arm = 18;
      screen.setTransform(dpr, 0, 0, dpr, 0, 0);
      screen.globalAlpha = Math.min(1, (t - 0.6) / 0.4);
      screen.fillStyle = PAL.gold;
      for (const [cx, cy, sx, sy] of [
        [left, top, 1, 1],
        [right, top, -1, 1],
        [left, bottom, 1, -1],
        [right, bottom, -1, -1],
      ] as const) {
        const x0 = sx > 0 ? cx - thick - 4 : cx + 4;
        const y0 = sy > 0 ? cy - thick - 4 : cy + 4;
        screen.fillRect(sx > 0 ? x0 : x0 + thick - arm, y0, arm, thick);
        screen.fillRect(x0, sy > 0 ? y0 : y0 + thick - arm, thick, arm);
      }
      screen.globalAlpha = 1;
    }

    const joy = overlay.joystick;
    if (joy) {
      screen.setTransform(dpr, 0, 0, dpr, 0, 0);
      // 바깥 링은 속을 비워 마을이 보이게 하고, 손잡이는 흰 눈 면에 남색 테두리
      screen.strokeStyle = PAL.snow;
      screen.lineWidth = 4;
      screen.beginPath();
      screen.arc(joy.baseX, joy.baseY, 48, 0, Math.PI * 2);
      screen.stroke();
      screen.strokeStyle = INK;
      screen.lineWidth = 2;
      screen.stroke();
      screen.fillStyle = PAL.snow;
      screen.strokeStyle = INK;
      screen.beginPath();
      screen.arc(joy.knobX, joy.knobY, 22, 0, Math.PI * 2);
      screen.fill();
      screen.stroke();
    }
  }

  return { resize, paintTrail, burst, draw, focusOn, toWorld, toScreen, size: () => ({ width: cssW, height: cssH }) };
}

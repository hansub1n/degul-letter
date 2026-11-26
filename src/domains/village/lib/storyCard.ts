// 인스타 스토리용 공유 카드(1080x1920)를 그린다. 마을 그림은 마을 화면과 같은 렌더러로 한 번만 그리고,
// 대회 이름·마을 이름·@계정·#해시태그는 캔버스에 직접 그려 넣는다 (이미지만 공유해도 글자가 남도록).
// 편지 내용은 이 파일이 아예 받지 않는다. 숨긴 눈사람은 그리지 않고 수에도 넣지 않는다.

import { sculptFromBalls, type Sculpt } from "@/domains/snowman";
import { CONTEST_HANDLE, CONTEST_HASHTAG, CONTEST_NAME } from "@/shared/lib/contest";
import type { SavedSnowman } from "../types";
import { WORLD_HEIGHT, WORLD_WIDTH } from "./constants";
import { clamp, hash2 } from "./geometry";
import { createRenderer, type RenderOverlay } from "./render";
import { addStack, ballHeights } from "./rules";
import { createWorld } from "./world";

export const STORY_CARD_WIDTH = 1080;
export const STORY_CARD_HEIGHT = 1920;
/**
 * 인스타 스토리는 위(프로필·진행 막대)와 아래(답장 입력창) 약 250px를 앱 화면이 덮는다.
 * 이 여백에는 글자도 그림도 두지 않고, 링크 스티커를 붙일 자리로 남긴다.
 */
export const STORY_SAFE_MARGIN = 250;

/** 카드에 그릴 눈사람 한 명. 편지·작성자 정보는 담지 않는다 */
export type StoryCardSnowman = {
  savedId: string | null;
  x: number;
  y: number;
  /** 아래부터 눈덩이 반지름 */
  balls: readonly number[];
  sculpt: Sculpt | null;
  /** 마을 주인이 숨긴 눈사람이면 true. 그리지도 세지도 않는다 */
  hidden?: boolean;
};

export type StoryCardInput = {
  /** 마을 주인의 닉네임 ("○○의 마을"로 쓴다) */
  villageName: string;
  snowmen: readonly StoryCardSnowman[];
  /** 방금 만든 눈사람의 저장 ID. 있으면 그 눈사람 쪽을 크게 보여 준다 */
  focusId?: string | null;
};

/** 서버에서 불러온 눈사람을 카드 재료로 바꾼다. 작성자 이름·편지 ID는 버린다 */
export function toStoryCardSnowman(s: SavedSnowman): StoryCardSnowman {
  return {
    savedId: s.id,
    x: s.x,
    y: s.y,
    balls: s.balls,
    sculpt: s.sculpt,
    // 숨긴 눈사람 표시(owner-moderation)가 있는 쪽에서는 그 값을 따른다
    hidden: (s as { hidden?: boolean }).hidden === true,
  };
}

/** 숨긴 눈사람과 눈덩이 없는 자료를 뺀, 카드에 그릴 눈사람 */
export function visibleStorySnowmen(snowmen: readonly StoryCardSnowman[]): StoryCardSnowman[] {
  return snowmen.filter((s) => !s.hidden && s.balls.length > 0);
}

// 카드 위쪽부터: 대회 이름 → 마을 그림 → 마을 이름·눈사람 수 → @계정 → #해시태그. 모두 가운데 안전한 영역(250 ~ 1670)에 둔다.
const PICTURE = { x: 60, y: 372, w: 960, h: 840 };
const FRAME = 12;
const Y_CONTEST = 306;
const Y_VILLAGE = 1290;
const Y_COUNT = 1362;
const Y_HANDLE = 1470;
const Y_HASHTAG = 1584;

// 글자 크기는 갈무리체가 또렷한 12의 배수로 둔다
const SIZE_CONTEST = 48;
const SIZE_VILLAGE = 60;
const SIZE_COUNT = 36;
const SIZE_HANDLE = 96;
const SIZE_HASHTAG = 96;

const COLORS = {
  day: { sky: "#BFD9F2", snow: "#FFFFFF", snowShade: "#DCE5F2", snowEdge: "#A9B8D6", flake: "#FFFFFF" },
  night: { sky: "#1A1730", snow: "#A3A8DE", snowShade: "#8C92CB", snowEdge: "#6E74AC", flake: "#FFFFFF" },
} as const;
const INK = "#2A2350";
const GOLD = "#FFC94D";
const WHITE = "#FFFFFF";

/** 마을 그림 한 칸(게임 픽셀 1개)을 몇 칸으로 키울지: 눈사람에 맞추면 3배, 마을 전체면 2배 */
const SCALE_FOCUS = 3;
const SCALE_ALL = 2;

function isNight(): boolean {
  return document.documentElement.dataset.time === "night";
}

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function context(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("캔버스 2D 컨텍스트를 만들 수 없어요");
  return ctx;
}

/** 저장된 눈사람들을 눈 마당에 세운다 (마을 화면과 같은 규칙: 완성된 눈사람, 조각이 없으면 눈덩이 모양으로) */
function buildWorld(snowmen: readonly StoryCardSnowman[]) {
  const world = createWorld();
  // 굴릴 눈덩이와 캐릭터는 카드에 넣지 않는다. 캐릭터는 그림 밖으로 치워 둔다
  world.stacks = [];
  world.player.x = -100;
  world.player.y = -100;
  world.time = 3;
  for (const s of snowmen) {
    const [first, ...rest] = s.balls;
    const stack = addStack(world, s.x, s.y, { r: first, roll: 0 });
    for (const r of rest) stack.balls.push({ r, roll: 0 });
    stack.finished = true;
    stack.sculpt = s.sculpt ?? sculptFromBalls(stack.balls, ballHeights(stack));
  }
  return world;
}

/** 마을 그림(PICTURE 크기). 방금 만든 눈사람이 있으면 그 주변을, 없으면 마을 전체를 보여 준다 */
function paintVillage(snowmen: readonly StoryCardSnowman[], focusId: string | null | undefined): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  const renderer = createRenderer(canvas, WORLD_WIDTH, WORLD_HEIGHT);
  renderer.resize(PICTURE.w, PICTURE.h, 1);
  const focusOn = focusId ? snowmen.find((s) => s.savedId === focusId) : undefined;
  const scale = focusOn ? SCALE_FOCUS : SCALE_ALL;
  const viewW = PICTURE.w / scale;
  const viewH = PICTURE.h / scale;
  // 눈사람 몸 한가운데쯤이 오게 하되, 마을 밖이 보이지 않게 가장자리에서 멈춘다
  // 초점이 없으면 눈사람들의 한가운데를 본다(눈사람이 없으면 마을 한가운데)
  const mean = (pick: (s: StoryCardSnowman) => number, fallback: number) =>
    snowmen.length > 0 ? snowmen.reduce((sum, s) => sum + pick(s), 0) / snowmen.length : fallback;
  const centerX = focusOn ? focusOn.x : mean((s) => s.x, WORLD_WIDTH / 2);
  const centerY = focusOn ? focusOn.y - 20 : mean((s) => s.y - 20, WORLD_HEIGHT / 2);
  const x = clamp(centerX, viewW / 2, WORLD_WIDTH - viewW / 2);
  const y = clamp(centerY, viewH / 2, WORLD_HEIGHT - viewH / 2);
  const overlay: RenderOverlay = {
    joystick: null,
    highlightId: null,
    charge: null,
    hammer: null,
    focus: { x, y, scale, t: 1 },
    editing: null,
    celebrate: null,
    mailCount: 0,
    mailBadge: false,
    hop: null,
    guideId: null,
  };
  renderer.draw(buildWorld(snowmen), overlay);
  return canvas;
}

/** 하늘과 눈 언덕, 흩날리는 눈. 위아래 안전 여백에는 이것만 있다 */
function paintBackground(ctx: CanvasRenderingContext2D): void {
  const c = isNight() ? COLORS.night : COLORS.day;
  ctx.fillStyle = c.sky;
  ctx.fillRect(0, 0, STORY_CARD_WIDTH, STORY_CARD_HEIGHT);

  const STEP = 12;
  const hillY = (x: number) => 1180 + Math.round((Math.sin(x / 140) * 36 + Math.sin(x / 47) * 12) / STEP) * STEP;
  for (let x = 0; x < STORY_CARD_WIDTH; x += STEP) {
    const top = hillY(x);
    ctx.fillStyle = c.snowEdge;
    ctx.fillRect(x, top - STEP, STEP, STEP);
    ctx.fillStyle = c.snow;
    ctx.fillRect(x, top, STEP, STORY_CARD_HEIGHT - top);
    ctx.fillStyle = c.snowShade;
    ctx.fillRect(x, top, STEP, STEP);
  }

  ctx.fillStyle = c.flake;
  for (let i = 0; i < 90; i++) {
    const size = hash2(i, 3) < 0.6 ? 6 : 12;
    const x = Math.floor((hash2(i, 11) * STORY_CARD_WIDTH) / 6) * 6;
    const y = Math.floor((hash2(11, i) * STORY_CARD_HEIGHT) / 6) * 6;
    ctx.globalAlpha = size === 6 ? 0.6 : 0.9;
    ctx.fillRect(x, y, size, size);
  }
  ctx.globalAlpha = 1;
}

function paintFramedPicture(ctx: CanvasRenderingContext2D, picture: HTMLCanvasElement): void {
  const { x, y, w, h } = PICTURE;
  // 도트 상자처럼 아래쪽에 그림자 한 칸, 남색 테두리
  ctx.fillStyle = INK;
  ctx.fillRect(x - FRAME, y - FRAME, w + FRAME * 2, h + FRAME * 2 + FRAME);
  ctx.fillStyle = WHITE;
  ctx.fillRect(x - FRAME / 2, y - FRAME / 2, w + FRAME, h + FRAME);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(picture, 0, 0, picture.width, picture.height, x, y, w, h);
}

function paintText(
  ctx: CanvasRenderingContext2D,
  family: string,
  text: string,
  y: number,
  size: number,
  fill: string,
): void {
  ctx.font = `700 ${size}px ${family}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  ctx.lineWidth = size / 4;
  ctx.strokeStyle = INK;
  ctx.strokeText(text, STORY_CARD_WIDTH / 2, y);
  ctx.fillStyle = fill;
  ctx.fillText(text, STORY_CARD_WIDTH / 2, y);
}

function toBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("카드 이미지를 만들지 못했어요"))), "image/png");
  });
}

/** 스토리 카드 PNG를 만든다 (1080x1920) */
export async function renderStoryCard({ villageName, snowmen, focusId }: StoryCardInput): Promise<Blob> {
  const family = cssVar("--font-pixel") || "sans-serif";
  // 캔버스는 글꼴을 스스로 불러오지 않는다. 그리기 전에 쓸 글자를 불러 둔다
  const sample = `${CONTEST_NAME} ${villageName}의 마을 눈사람 명이 모였어요 ${CONTEST_HANDLE} ${CONTEST_HASHTAG}`;
  await document.fonts?.load(`700 48px ${family}`, sample).catch(() => undefined);

  const visible = visibleStorySnowmen(snowmen);
  const canvas = document.createElement("canvas");
  canvas.width = STORY_CARD_WIDTH;
  canvas.height = STORY_CARD_HEIGHT;
  const ctx = context(canvas);
  ctx.imageSmoothingEnabled = false;

  paintBackground(ctx);
  paintText(ctx, family, CONTEST_NAME, Y_CONTEST, SIZE_CONTEST, WHITE);
  paintFramedPicture(ctx, paintVillage(visible, focusId));
  paintText(ctx, family, `${villageName}의 마을`, Y_VILLAGE, SIZE_VILLAGE, WHITE);
  if (visible.length > 0) paintText(ctx, family, `눈사람 ${visible.length}명이 모였어요`, Y_COUNT, SIZE_COUNT, WHITE);
  paintText(ctx, family, CONTEST_HANDLE, Y_HANDLE, SIZE_HANDLE, WHITE);
  paintText(ctx, family, CONTEST_HASHTAG, Y_HASHTAG, SIZE_HASHTAG, GOLD);

  return toBlob(canvas);
}

// 인스타 스토리용 공유 카드(1080x1920)를 그린다.
// 하늘과 눈밭 위에 내 눈사람(조각 모양 그대로)과 데굴이를 크게 세우고, 데굴이가 말풍선으로 한마디 한다.
// 참가 번호·축제 이름·닉네임·#해시태그·@계정은 캔버스에 직접 그려 넣는다 (이미지만 공유해도 글자가 남도록).
// 편지 내용은 이 파일이 아예 받지 않는다. 숨긴 눈사람은 그리지 않는다.

import { drawSculpt, sculptFromBalls, type Sculpt } from "@/domains/snowman";
import { STORY_HANDLE, STORY_HASHTAG } from "@/shared/lib/storyShare";
import type { SavedSnowman } from "../types";
import { hash2 } from "./geometry";
import { storyHeroSprite } from "./render";
import { ballHeights } from "./rules";
import type { Stack } from "./types";

export const STORY_CARD_WIDTH = 1080;
export const STORY_CARD_HEIGHT = 1920;
/**
 * 인스타 스토리는 위(프로필·진행 막대)와 아래(답장 입력창) 약 250px를 앱 화면이 덮는다.
 * 이 여백에는 글자도 그림도 두지 않는다.
 */
export const STORY_SAFE_MARGIN = 250;

/** 데굴이 말풍선 글자 수 한도 */
export const STORY_SPEECH_MAX = 30;
/** 말풍선을 비워 두면 들어가는 기본 문구 */
export const STORY_SPEECH_DEFAULT = "나보다 잘 만드는 사람 나와봐";
/** 말풍선 예시 문구 (누르면 그대로 들어간다) */
export const STORY_SPEECH_PRESETS = [STORY_SPEECH_DEFAULT, "who made this? it's me", "이거 내가 만듦"] as const;
/** 예시 문구는 말이 끊기는 자리에서 줄을 바꾼다 (없으면 한 줄, 칸이 모자라면 자동 줄바꿈) */
const SPEECH_LINES: Record<string, readonly string[]> = {
  [STORY_SPEECH_DEFAULT]: ["나보다 잘 만드는 사람", "나와봐"],
  "who made this? it's me": ["who made this?", "it's me"],
};

/** 카드에 그릴 눈사람 한 명. 편지 내용은 담지 않는다 */
export type StoryCardSnowman = {
  savedId: string | null;
  /** 눈사람 이름(만든 사람 닉네임) */
  authorName: string | null;
  x: number;
  y: number;
  /** 아래부터 눈덩이 반지름 */
  balls: readonly number[];
  sculpt: Sculpt | null;
  /** 마을 주인이 숨긴 눈사람이면 true. 그리지도 세지도 않는다 */
  hidden?: boolean;
};

export type StoryCardInput = {
  /** 마을 주인의 닉네임. 내 눈사람을 못 찾았을 때만 "○○의 마을"로 쓴다 */
  villageName: string;
  /** 마을의 눈사람들 (세운 순서). 참가 번호는 이 안에서 몇 번째인지로 매긴다 */
  snowmen: readonly StoryCardSnowman[];
  /** 내 눈사람의 저장 ID. 이 눈사람을 카드에 세운다 */
  focusId?: string | null;
  /** 데굴이 말풍선. 비어 있으면 기본 문구 */
  speech?: string;
};

/** 서버에서 불러온 눈사람을 카드 재료로 바꾼다. 편지 ID는 버린다 */
export function toStoryCardSnowman(s: SavedSnowman): StoryCardSnowman {
  return { savedId: s.id, authorName: s.authorName, x: s.x, y: s.y, balls: s.balls, sculpt: s.sculpt, hidden: s.hidden };
}

/** 숨긴 눈사람과 눈덩이 없는 자료를 뺀, 카드에 쓸 눈사람 */
export function visibleStorySnowmen(snowmen: readonly StoryCardSnowman[]): StoryCardSnowman[] {
  return snowmen.filter((s) => !s.hidden && s.balls.length > 0);
}

// ---------- 배치 (모두 가운데 안전한 영역 250 ~ 1670 안) ----------

const SIDE = 96;
const Y_TAGS = 318;
/** 눈밭이 시작하는 줄. 눈사람과 데굴이가 이 줄 조금 아래에 선다 */
const Y_GROUND = 1236;
const Y_FEET = Y_GROUND + 36;
/** 눈사람이 차지할 최대 키·폭 (카드 픽셀) */
const SNOWMAN_MAX_H = 780;
const SNOWMAN_MAX_W = 520;
const Y_NAME = 1404;
const Y_HASHTAG = 1488;
const Y_HANDLE = 1548;
/** 1590 ~ 1670: 링크 스티커를 붙일 빈자리 (올린 사람이 자기 마을 링크 등을 알아서 붙인다) */

// 글자 크기는 갈무리체가 또렷한 12의 배수로 둔다
const SIZE_TAG = 36;
const SIZE_NAME = 96;
const SIZE_HASHTAG = 48;
const SIZE_HANDLE = 36;
const SIZE_SPEECH = 36;

/** 눈사람 오른쪽 끝에서 데굴이까지 띄울 거리 (눈사람 바로 옆에 붙어 선다) */
const HERO_GAP = 36;
/** 데굴이가 서는 자리(왼쪽 끝). 눈사람은 이 왼쪽에 붙여 세운다 */
const HERO_LEFT = 600;
/** 데굴이 그림 한 칸을 카드에서 몇 픽셀로 (11x13칸 → 110x130) */
const HERO_SCALE = 10;
/** 말풍선·참가 번호 상자의 도트 한 칸 (게임 화면의 --p 한 칸을 카드에서 이만큼으로) */
const DOT = 6;

const COLORS = {
  day: { sky: "#D6E4F5", ground: "#FFFFFF", groundShade: "#DCE5F2", groundEdge: "#A9B8D6", flake: "#FFFFFF", text: "#2A2350", handle: "#7D8BB0" },
  night: { sky: "#1A1730", ground: "#A3A8DE", groundShade: "#8C92CB", groundEdge: "#6E74AC", flake: "#FFFFFF", text: "#FFFFFF", handle: "#2A2350" },
} as const;
const INK = "#2A2350";
const WHITE = "#FFFFFF";
const ROOF = "#C94B42";
const ROOF_SHADE = "#A63A33";
const SHADOW = "#B8C4DC";
/** 말풍선: 흰 면·남색 테두리·진한 남색 글자 (휴대폰 스토리 크기에서도 읽히게) */
const SPEECH = { fill: "#FFFFFF", shade: "#DCE5F2", line: "#2A2350", text: "#2A2350" } as const;

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

/** 눈사람의 조각 모양. 조각하지 않았으면 눈덩이로 만든 기본 모양 (마을 화면과 같은 규칙) */
function sculptOf(s: StoryCardSnowman): Sculpt {
  if (s.sculpt) return s.sculpt;
  const stack = { balls: s.balls.map((r) => ({ r, roll: 0 })) } as unknown as Stack;
  return sculptFromBalls(stack.balls, ballHeights(stack));
}

/** 조각에서 실제로 칸이 찬 범위 (빈 여백 빼고) */
function contentBox(s: Sculpt): { left: number; right: number; top: number; bottom: number } {
  let left = s.width;
  let right = -1;
  let top = s.height;
  let bottom = -1;
  for (let y = 0; y < s.height; y++) {
    for (let x = 0; x < s.width; x++) {
      if (!s.cells[y * s.width + x]) continue;
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
  }
  return right < 0 ? { left: 0, right: 0, top: 0, bottom: 0 } : { left, right, top, bottom };
}

/** 하늘, 눈밭, 흩날리는 눈 */
function paintBackground(ctx: CanvasRenderingContext2D): void {
  const c = isNight() ? COLORS.night : COLORS.day;
  ctx.fillStyle = c.sky;
  ctx.fillRect(0, 0, STORY_CARD_WIDTH, STORY_CARD_HEIGHT);
  ctx.fillStyle = c.groundEdge;
  ctx.fillRect(0, Y_GROUND - DOT, STORY_CARD_WIDTH, DOT);
  ctx.fillStyle = c.ground;
  ctx.fillRect(0, Y_GROUND, STORY_CARD_WIDTH, STORY_CARD_HEIGHT - Y_GROUND);
  ctx.fillStyle = c.groundShade;
  ctx.fillRect(0, Y_GROUND, STORY_CARD_WIDTH, DOT);

  ctx.fillStyle = c.flake;
  for (let i = 0; i < 70; i++) {
    const size = hash2(i, 3) < 0.6 ? DOT : DOT * 2;
    const x = Math.floor((hash2(i, 11) * STORY_CARD_WIDTH) / DOT) * DOT;
    const y = Math.floor((hash2(11, i) * Y_GROUND) / DOT) * DOT;
    ctx.globalAlpha = size === DOT ? 0.7 : 0.95;
    ctx.fillRect(x, y, size, size);
  }
  ctx.globalAlpha = 1;
}

/** 바닥 그림자 (도트 타원) */
function paintShadow(ctx: CanvasRenderingContext2D, cx: number, cy: number, rw: number): void {
  ctx.fillStyle = isNight() ? COLORS.night.groundEdge : SHADOW;
  const rh = Math.max(DOT, Math.round((rw * 0.28) / DOT) * DOT);
  for (let dy = -rh; dy <= rh; dy += DOT) {
    const w = Math.round((rw * Math.sqrt(Math.max(0, 1 - (dy * dy) / ((rh + DOT / 2) * (rh + DOT / 2))))) / DOT) * DOT;
    ctx.fillRect(cx - w, cy + dy, w * 2, DOT);
  }
}

/**
 * 게임 화면의 도트 상자(.pixel-box)와 같은 모양: 흰 면, 위 한 줄 밝게·아래 한 줄 그늘,
 * 남색 1칸 테두리, 아래로 남색 그림자 1칸. (x, y, w, h)는 테두리 안쪽 면.
 */
function paintPixelBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string,
  shade: string,
  line: string = INK,
): void {
  ctx.fillStyle = line;
  ctx.fillRect(x, y - DOT, w, DOT);
  ctx.fillRect(x, y + h, w, DOT * 2);
  ctx.fillRect(x - DOT, y, DOT, h + DOT);
  ctx.fillRect(x + w, y, DOT, h + DOT);
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = shade;
  ctx.fillRect(x, y + h - DOT, w, DOT);
}

/** 말풍선 글자를 maxWidth에 맞춰 줄로 나눈다 (띄어쓰기에서 먼저 끊고, 긴 단어는 글자 단위로) */
function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width <= maxWidth) {
      line = next;
      continue;
    }
    if (line) lines.push(line);
    line = "";
    for (const ch of word) {
      if (ctx.measureText(line + ch).width > maxWidth && line) {
        lines.push(line);
        line = "";
      }
      line += ch;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * 말풍선 줄 나누기.
 * 1) 예시 문구는 정해 둔 자리에서 (칸에 들어가면)
 * 2) 직접 쓴 글은 ? ! . 뒤에서 먼저 끊고, 각 부분이 넘치면 칸에 맞춰 줄을 바꾼다
 * 3) 한 부분 안에서는 줄 수를 그대로 두며 폭을 좁혀, 마지막 줄에 단어 하나만 떨어지지 않게 고르게 나눈다
 */
function speechLines(ctx: CanvasRenderingContext2D, text: string, maxText: number): string[] {
  const preset = SPEECH_LINES[text];
  if (preset && preset.every((line) => ctx.measureText(line).width <= maxText)) return [...preset];
  const parts = text.split(/(?<=[?!.])\s+/).filter(Boolean);
  return parts.flatMap((part) => {
    let lines = wrapLines(ctx, part, maxText);
    for (let width = maxText - DOT * 2; lines.length > 1 && width > SIZE_SPEECH * 3; width -= DOT * 2) {
      const tighter = wrapLines(ctx, part, width);
      if (tighter.length > lines.length) break;
      lines = tighter;
    }
    return lines;
  });
}

/**
 * 데굴이 말풍선: 모서리를 도트 한 칸씩 깎은 둥근 흰 상자 + 데굴이 머리 바로 위를 가리키는 두 칸 꼬리.
 * 꼬리 끝은 (tailX, tailY)에 오고, 상자는 minLeft(데굴이가 선 자리)에서 시작해 오른쪽으로 펼친다.
 */
function paintSpeech(ctx: CanvasRenderingContext2D, family: string, text: string, tailX: number, tailY: number, minLeft: number): void {
  ctx.font = `400 ${SIZE_SPEECH}px ${family}`;
  const right = STORY_CARD_WIDTH - SIDE / 2;
  const maxText = Math.min(432, right - minLeft - DOT * 10);
  const lines = speechLines(ctx, text, maxText);
  const lineH = Math.round(SIZE_SPEECH * 1.4);
  const textW = Math.max(...lines.map((l) => ctx.measureText(l).width));
  const w = Math.ceil((textW + DOT * 10) / DOT) * DOT;
  const h = Math.ceil((lines.length * lineH + DOT * 4) / DOT) * DOT;
  // 상자 왼쪽 끝을 minLeft(데굴이가 선 자리)에 맞추고, 카드 오른쪽 끝을 넘으면 왼쪽으로 당긴다
  const x = Math.min(Math.round(minLeft / DOT) * DOT, right - w);
  const y = tailY - DOT * 4 - h;

  // 둥근 도트 상자: 테두리는 모서리 한 칸을 비우고, 안쪽 모서리 칸을 남색으로 채워 둥글게 보이게 한다
  ctx.fillStyle = SPEECH.line;
  ctx.fillRect(x, y - DOT, w, DOT);
  ctx.fillRect(x, y + h, w, DOT);
  ctx.fillRect(x - DOT, y, DOT, h);
  ctx.fillRect(x + w, y, DOT, h);
  // 아래로 한 칸 그림자 (게임 화면 상자처럼)
  ctx.fillRect(x + DOT, y + h + DOT, w - DOT * 2, DOT);
  ctx.fillStyle = SPEECH.fill;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = SPEECH.shade;
  ctx.fillRect(x + DOT, y + h - DOT, w - DOT * 2, DOT);
  ctx.fillStyle = SPEECH.line;
  for (const [cx, cy] of [
    [x, y],
    [x + w - DOT, y],
    [x, y + h - DOT],
    [x + w - DOT, y + h - DOT],
  ]) {
    ctx.fillRect(cx, cy, DOT, DOT);
  }

  // 꼬리: 데굴이 머리 바로 위. 상자 아래 테두리를 뚫고 두 칸 내려오며 한 칸씩 좁아진다
  const tx = Math.min(Math.max(Math.round(tailX / DOT) * DOT - DOT, x + DOT * 2), x + w - DOT * 4);
  ctx.fillStyle = SPEECH.line;
  ctx.fillRect(tx - DOT, y + h, DOT * 4, DOT * 2);
  ctx.fillRect(tx, y + h + DOT * 2, DOT * 2, DOT * 2);
  ctx.fillStyle = SPEECH.fill;
  ctx.fillRect(tx, y + h - DOT, DOT * 2, DOT * 3);

  ctx.fillStyle = SPEECH.text;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  lines.forEach((line, i) => ctx.fillText(line, x + w / 2, y + DOT * 2 + lineH * (i + 0.5)));
}

/** 왼쪽 위 빨간 참가 번호 꼬리표 */
function paintEntryTag(ctx: CanvasRenderingContext2D, family: string, text: string): void {
  ctx.font = `700 ${SIZE_TAG}px ${family}`;
  const w = Math.ceil((ctx.measureText(text).width + DOT * 8) / DOT) * DOT;
  const h = DOT * 10;
  const y = Y_TAGS - h / 2;
  paintPixelBox(ctx, SIDE, y, w, h, ROOF, ROOF_SHADE);
  ctx.fillStyle = WHITE;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, SIDE + w / 2, Y_TAGS);
}

function paintText(
  ctx: CanvasRenderingContext2D,
  family: string,
  text: string,
  x: number,
  y: number,
  size: number,
  fill: string,
  align: CanvasTextAlign = "center",
): void {
  ctx.font = `700 ${size}px ${family}`;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
}

function toBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("카드 이미지를 만들지 못했어요"))), "image/png");
  });
}

/** 스토리 카드 PNG를 만든다 (1080x1920) */
export async function renderStoryCard({ villageName, snowmen, focusId, speech }: StoryCardInput): Promise<Blob> {
  const family = cssVar("--font-pixel") || "sans-serif";
  const visible = visibleStorySnowmen(snowmen);
  const index = focusId ? visible.findIndex((s) => s.savedId === focusId) : -1;
  const focus = index >= 0 ? visible[index] : visible[visible.length - 1];
  const entryNo = `ENTRY No.${String((index >= 0 ? index : visible.length - 1) + 1).padStart(3, "0")}`;
  const festival = `SNOW FES ${new Date().getFullYear()}`;
  const name = focus?.authorName || `${villageName}의 마을`;
  const line = speech?.trim() || STORY_SPEECH_DEFAULT;

  // 캔버스는 글꼴을 스스로 불러오지 않는다. 그리기 전에 쓸 글자를 불러 둔다
  const sample = `${entryNo} ${festival} ${name} ${line} ${STORY_HASHTAG} ${STORY_HANDLE}`;
  await Promise.all([
    document.fonts?.load(`700 48px ${family}`, sample),
    document.fonts?.load(`400 ${SIZE_SPEECH}px ${family}`, sample),
  ]).catch(() => undefined);

  const canvas = document.createElement("canvas");
  canvas.width = STORY_CARD_WIDTH;
  canvas.height = STORY_CARD_HEIGHT;
  const ctx = context(canvas);
  ctx.imageSmoothingEnabled = false;
  const c = isNight() ? COLORS.night : COLORS.day;

  paintBackground(ctx);
  paintEntryTag(ctx, family, entryNo);
  paintText(ctx, family, festival, STORY_CARD_WIDTH - SIDE, Y_TAGS, SIZE_TAG, c.text, "right");

  // 데굴이: 정면을 보고 눈사람 오른쪽에 선다. 눈사람과 같은 배율로 키운다
  const hero = storyHeroSprite("down");
  if (focus) {
    const sculpt = sculptOf(focus);
    const box = contentBox(sculpt);
    const cellsW = box.right - box.left + 1;
    const cellsH = box.bottom - box.top + 1;
    const scale = Math.max(4, Math.min(16, Math.floor(Math.min(SNOWMAN_MAX_H / cellsH, SNOWMAN_MAX_W / cellsW))));
    const width = cellsW * scale;
    // 데굴이는 늘 같은 자리에 서고, 눈사람은 그 바로 왼쪽에 붙여 세운다 (눈사람이 넓으면 데굴이를 오른쪽으로 민다)
    const heroW = hero.width * HERO_SCALE;
    const heroH = hero.height * HERO_SCALE;
    const heroLeft = Math.min(Math.max(HERO_LEFT, SIDE + width + HERO_GAP), STORY_CARD_WIDTH - SIDE - heroW);
    const left = Math.max(SIDE, heroLeft - HERO_GAP - width);
    const top = Y_FEET - cellsH * scale;
    paintShadow(ctx, left + width / 2, Y_FEET, width * 0.5);
    drawSculpt(ctx, sculpt, left - box.left * scale, top - box.top * scale, scale);

    // 데굴이는 눈사람 크기와 상관없이 같은 크기 (큰 눈사람 옆에서도 얼굴이 보이게)
    const heroTop = Y_FEET - heroH;
    paintShadow(ctx, heroLeft + heroW / 2, Y_FEET, heroW * 0.45);
    ctx.drawImage(hero, heroLeft, heroTop, heroW, heroH);
    // 말풍선은 데굴이가 선 자리에서 시작해 오른쪽으로 펼친다 (눈사람은 데굴이 왼쪽이라 가리지 않는다)
    paintSpeech(ctx, family, line, heroLeft + heroW / 2, heroTop - DOT * 2, heroLeft);
  }

  paintText(ctx, family, name, STORY_CARD_WIDTH / 2, Y_NAME, SIZE_NAME, INK);
  paintText(ctx, family, STORY_HASHTAG, STORY_CARD_WIDTH / 2, Y_HASHTAG, SIZE_HASHTAG, ROOF);
  paintText(ctx, family, STORY_HANDLE, STORY_CARD_WIDTH / 2, Y_HANDLE, SIZE_HANDLE, c.handle);

  return toBlob(canvas);
}

// 눈조각 데이터와 규칙. 1칸 = 마을 화면의 게임 픽셀 1개라서, 조각한 모양이 마을에 그대로 서 있다.
// 칸마다 값은 넷 중 하나: 비었음(0) / 눈(1) / 움푹(2, 눌러서 들어간 자리) / 이음새(3, 눈덩이와 눈덩이 사이 선).

export const EMPTY = 0;
export const SNOW = 1;
export const DENT = 2;
/** 위 눈덩이가 아래 눈덩이에 얹힌 경계선. 문지르기 전까지는 남아서 눈덩이를 쌓은 모양이 그대로 보인다. */
export const SEAM = 3;

export type SculptTool = "carve" | "add" | "press" | "smooth";

export type Sculpt = {
  width: number;
  height: number;
  /** 눈사람 중심(마을에서의 x 좌표)이 몇 번째 열인지 */
  originX: number;
  /** 맨 아랫줄(height - 1)이 땅. 칸 값은 EMPTY / SNOW / DENT / SEAM */
  cells: Uint8Array;
};

/** 좌우 여백: 팔이나 귀를 붙일 자리 */
const MARGIN_X = 8;
/** 위쪽 여백: 머리 위에 붙일 자리 */
const MARGIN_TOP = 10;

export function cellAt(s: Sculpt, x: number, y: number): number {
  if (x < 0 || y < 0 || x >= s.width || y >= s.height) return EMPTY;
  return s.cells[y * s.width + x];
}

function setCell(s: Sculpt, x: number, y: number, value: number): boolean {
  if (x < 0 || y < 0 || x >= s.width || y >= s.height) return false;
  const i = y * s.width + x;
  if (s.cells[i] === value) return false;
  s.cells[i] = value;
  return true;
}

export function cloneSculpt(s: Sculpt): Sculpt {
  return { ...s, cells: s.cells.slice() };
}

/**
 * 쌓은 눈덩이 모양 그대로 조각 재료를 만든다.
 * balls[i]의 중심은 땅에서 heights[i] 높이에 있다.
 * 위 눈덩이가 아래 눈덩이와 겹치는 곳의 테두리는 이음새(SEAM)로 남겨서, 조각 전에도 눈덩이를 쌓은 모양이 보이게 한다.
 */
export function sculptFromBalls(balls: ReadonlyArray<{ r: number }>, heights: readonly number[]): Sculpt {
  const maxR = Math.max(...balls.map((b) => Math.round(b.r)));
  const top = Math.max(...balls.map((b, i) => heights[i] + b.r));
  const width = maxR * 2 + 1 + MARGIN_X * 2;
  const height = Math.ceil(top) + MARGIN_TOP + 1;
  const originX = MARGIN_X + maxR;
  const sculpt: Sculpt = { width, height, originX, cells: new Uint8Array(width * height) };

  /** (x, y) 칸이 i번째 눈덩이 안인지. 마을에서 눈덩이를 그릴 때와 같은 판정을 쓴다. */
  const inBall = (i: number, x: number, y: number) => {
    const r = Math.round(balls[i].r);
    const gx = x - originX;
    const dy = height - 1 - y - heights[i];
    return gx * gx + dy * dy <= r * r + r * 0.5;
  };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!balls.some((_, i) => inBall(i, x, y))) continue;
      // 위 눈덩이(i ≥ 1)의 테두리인데 아래 눈덩이 안에 들어가 있으면 이음새
      const seam = balls.some(
        (_, i) =>
          i > 0 &&
          inBall(i, x, y) &&
          (!inBall(i, x - 1, y) || !inBall(i, x + 1, y) || !inBall(i, x, y - 1) || !inBall(i, x, y + 1)) &&
          balls.some((__, j) => j < i && inBall(j, x, y)),
      );
      sculpt.cells[y * width + x] = seam ? SEAM : SNOW;
    }
  }
  return sculpt;
}

function hasSolidNeighbor(s: Sculpt, x: number, y: number): boolean {
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if ((dx || dy) && cellAt(s, x + dx, y + dy) !== EMPTY) return true;
    }
  }
  return false;
}

/** 붓 한 번 찍기. size가 3이면 3x3칸. 바뀐 칸이 있으면 true. */
export function applyBrush(s: Sculpt, cx: number, cy: number, tool: SculptTool, size: 1 | 3): boolean {
  const half = size === 3 ? 1 : 0;
  let changed = false;
  for (let y = cy - half; y <= cy + half; y++) {
    for (let x = cx - half; x <= cx + half; x++) {
      const current = cellAt(s, x, y);
      if (tool === "carve") {
        changed = setCell(s, x, y, EMPTY) || changed;
      } else if (tool === "press") {
        // 누르기는 눈이 있는 곳만 움푹하게 만든다
        if (current === SNOW || current === SEAM) changed = setCell(s, x, y, DENT) || changed;
      } else if (tool === "smooth") {
        // 문지르기: 이음새와 움푹한 곳을 매끈한 눈으로 편다
        if (current === SEAM || current === DENT) changed = setCell(s, x, y, SNOW) || changed;
      } else if (current === EMPTY) {
        // 붙이기는 이미 있는 눈에 이어 붙일 때만 된다 (공중에 떠 있는 눈 방지)
        if (hasSolidNeighbor(s, x, y)) changed = setCell(s, x, y, SNOW) || changed;
      } else if (current === DENT || current === SEAM) {
        changed = setCell(s, x, y, SNOW) || changed;
      }
    }
  }
  return changed;
}

/** 손가락을 빠르게 움직여도 칸이 끊기지 않게 두 점 사이를 한 칸씩 채운다 (브레젠험 직선) */
export function strokeLine(
  s: Sculpt,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  tool: SculptTool,
  size: 1 | 3,
): boolean {
  let changed = false;
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  let x = x0;
  let y = y0;
  for (;;) {
    changed = applyBrush(s, x, y, tool, size) || changed;
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
  return changed;
}

// ---------- 명암 (왼쪽 위에서 빛이 온다고 정한다) ----------

const COLOR = {
  edge: "#A9B8D6",
  light: "#FFFFFF",
  base: "#F1F5FB",
  softShade: "#E2E9F4",
  shade: "#D2DCEC",
  dent: "#B3C1DB",
  dentShadow: "#7E90B5",
};

/** 칸 하나의 색. 비었으면 null. 사용자는 깎고 붙이기만 하고, 입체감은 여기서 자동으로 생긴다. */
export function shadeAt(s: Sculpt, x: number, y: number): string | null {
  const c = cellAt(s, x, y);
  if (c === EMPTY) return null;

  // 이음새는 바깥 테두리와 같은 색: 마을에서 눈덩이끼리 겹쳐 보이던 선과 똑같다.
  // 이음새 바로 아래 칸은 아래 규칙("왼쪽 위가 눈이 아니면 밝게")에 걸려 아래 눈덩이 윗면이 밝게 빛난다.
  if (c === SEAM) return COLOR.edge;

  if (c === DENT) {
    // 움푹한 곳은 빛이 오는 쪽(위·왼쪽) 벽 그림자가 진다
    return cellAt(s, x, y - 1) === SNOW || cellAt(s, x - 1, y) === SNOW ? COLOR.dentShadow : COLOR.dent;
  }

  // 바깥 테두리
  if (
    cellAt(s, x - 1, y) === EMPTY ||
    cellAt(s, x + 1, y) === EMPTY ||
    cellAt(s, x, y - 1) === EMPTY ||
    cellAt(s, x, y + 1) === EMPTY
  ) {
    return COLOR.edge;
  }
  // 빛을 받는 면: 왼쪽 위가 비었거나 움푹하면 밝게
  if (cellAt(s, x - 1, y - 1) !== SNOW || cellAt(s, x - 2, y - 2) === EMPTY) return COLOR.light;
  // 그늘진 면: 오른쪽 아래로 가까이 비었거나 움푹하면 어둡게
  if (cellAt(s, x + 1, y + 1) !== SNOW) return COLOR.shade;
  for (let k = 2; k <= 4; k++) {
    if (cellAt(s, x + k, y + k) === EMPTY) return k <= 2 ? COLOR.shade : COLOR.softShade;
  }
  return COLOR.base;
}

/** ctx의 (left, top)부터 칸 하나를 cellSize 픽셀로 그린다 */
export function drawSculpt(
  ctx: CanvasRenderingContext2D,
  s: Sculpt,
  left: number,
  top: number,
  cellSize: number,
): void {
  for (let y = 0; y < s.height; y++) {
    for (let x = 0; x < s.width; x++) {
      const color = shadeAt(s, x, y);
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(left + x * cellSize, top + y * cellSize, cellSize, cellSize);
    }
  }
}

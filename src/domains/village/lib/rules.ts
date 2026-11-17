// 굴리기·쌓기 규칙. 화면이나 DOM은 모르고, World를 받아서 바꾸고 일어난 일을 GameEvent로 알려 준다.

import {
  BALL_GROWTH_PER_PIXEL,
  BALL_MAX_RADIUS,
  BALL_START_RADIUS,
  HEAD_ON_THRESHOLD,
  HEAVY_BALL_SLOWDOWN,
  INPUT_DEADZONE,
  LIFT_SECONDS,
  MAX_STACK_HEIGHT,
  MIN_LOOSE_BALLS,
  NEARBY_STACK_DISTANCE,
  PLAYER_RADIUS,
  POP_SECONDS,
  PLAYER_SPEED,
  SPAWN_INTERVAL_SECONDS,
  STACK_OVERLAP,
  STACK_PUSH_SECONDS,
} from "./constants";
import { distance, easeInOutCubic } from "./geometry";
import type { Sculpt } from "@/domains/snowman";
import type { Ball, GameEvent, InputState, Stack, Vec, World } from "./types";

// ---------- 눈사람 모양 계산 ----------

/** 바닥에 닿는 범위. 충돌 판정에 쓴다. */
export function footRadius(stack: Stack): number {
  return stack.balls[0].r * 0.9;
}

/** 각 눈덩이 중심이 땅에서 얼마나 높은지. 위 눈덩이는 아래 눈덩이와 조금 겹친다. */
export function ballHeights(stack: Stack): number[] {
  const heights: number[] = [];
  stack.balls.forEach((ball, i) => {
    if (i === 0) heights.push(ball.r);
    else heights.push(heights[i - 1] + (stack.balls[i - 1].r + ball.r) * STACK_OVERLAP);
  });
  return heights;
}

/** 맨 위 눈덩이 꼭대기의 높이 */
export function stackTopHeight(stack: Stack): number {
  const heights = ballHeights(stack);
  return heights[heights.length - 1] + stack.balls[stack.balls.length - 1].r;
}

export function isLoose(stack: Stack): boolean {
  return stack.balls.length === 1 && !stack.finished;
}

// ---------- 충돌 ----------

function outOfBounds(world: World, x: number, y: number, r: number): boolean {
  return x < r || y < r || x > world.width - r || y > world.height - r;
}

function hitsObstacle(world: World, x: number, y: number, r: number): boolean {
  return world.obstacles.some((ob) => distance(x, y, ob.x, ob.y) < r + ob.r);
}

function findStackAt(world: World, x: number, y: number, r: number, ignoreId?: number): Stack | undefined {
  return world.stacks.find((s) => s.id !== ignoreId && distance(x, y, s.x, s.y) < r + footRadius(s));
}

function movingToward(from: Vec, to: Vec, mx: number, my: number): boolean {
  return (to.x - from.x) * mx + (to.y - from.y) * my > 0;
}

/** 캐릭터가 (x, y)에 설 수 있는지. 등지고 걸어가는 눈덩이는 막지 않는다. */
function playerBlocked(world: World, x: number, y: number, mx: number, my: number): boolean {
  if (outOfBounds(world, x, y, PLAYER_RADIUS) || hitsObstacle(world, x, y, PLAYER_RADIUS)) return true;
  const p = world.player;
  return world.stacks.some(
    (s) => distance(x, y, s.x, s.y) < PLAYER_RADIUS + footRadius(s) && movingToward(p, s, mx, my),
  );
}

function isFreeSpot(world: World, x: number, y: number, r: number): boolean {
  return (
    !outOfBounds(world, x, y, r) &&
    !hitsObstacle(world, x, y, r) &&
    !findStackAt(world, x, y, r + 2) &&
    distance(x, y, world.player.x, world.player.y) > r + PLAYER_RADIUS + 2
  );
}

/** center 주변 minDist~maxDist 사이(없으면 맵 전체)에서 빈자리를 찾는다. */
function findFreeSpot(
  world: World,
  r: number,
  around?: { center: Vec; minDist: number; maxDist: number },
): Vec | null {
  for (let tries = 0; tries < 30; tries++) {
    let x: number;
    let y: number;
    if (around) {
      const angle = Math.random() * Math.PI * 2;
      const d = around.minDist + Math.random() * (around.maxDist - around.minDist);
      x = around.center.x + Math.cos(angle) * d;
      y = around.center.y + Math.sin(angle) * d * 0.8;
    } else {
      x = r + Math.random() * (world.width - r * 2);
      y = r + Math.random() * (world.height - r * 2);
    }
    if (isFreeSpot(world, x, y, r)) return { x, y };
  }
  return null;
}

// ---------- 눈덩이 만들기 ----------

export function addStack(world: World, x: number, y: number, ball: Ball): Stack {
  const stack: Stack = {
    id: world.nextId++,
    x,
    y,
    balls: [ball],
    finished: false,
    wobble: 0,
    pop: null,
    sculpt: null,
    saved: null,
  };
  world.stacks.push(stack);
  return stack;
}

function newBall(): Ball {
  return { r: BALL_START_RADIUS, roll: Math.random() * 50 };
}

/** 굴릴 눈덩이가 부족하면 빈자리에 새로 만든다. 캐릭터 바로 옆에는 만들지 않는다. */
export function fillLooseBalls(world: World, count: number): void {
  for (let i = 0; i < count; i++) {
    if (world.stacks.filter(isLoose).length >= MIN_LOOSE_BALLS) return;
    const spot = findFreeSpot(world, BALL_START_RADIUS + 2);
    if (!spot || distance(spot.x, spot.y, world.player.x, world.player.y) < 30) continue;
    addStack(world, spot.x, spot.y, newBall());
  }
}

// ---------- 한 프레임 진행 ----------

export function step(world: World, input: InputState, dt: number): GameEvent[] {
  const events: GameEvent[] = [];
  world.time += dt;

  for (const s of world.stacks) {
    s.wobble *= Math.pow(0.15, dt);
    if (s.wobble < 0.01) s.wobble = 0;
    if (s.pop) {
      s.pop.t += dt / POP_SECONDS;
      if (s.pop.t >= 1) {
        s.pop = null;
        s.wobble = 0.35;
      }
    }
  }

  if (world.lift) {
    world.player.walking = false;
    stepLift(world, dt, events);
    return events;
  }

  movePlayer(world, input, dt, events);

  world.spawnTimer -= dt;
  if (world.spawnTimer <= 0) {
    world.spawnTimer = SPAWN_INTERVAL_SECONDS;
    fillLooseBalls(world, 1);
  }
  return events;
}

function resetPush(world: World): void {
  world.push.targetId = null;
  world.push.time = 0;
  world.push.warned = false;
}

function movePlayer(world: World, input: InputState, dt: number, events: GameEvent[]): void {
  const p = world.player;
  let mx = input.x;
  let my = input.y;
  const len = Math.hypot(mx, my);
  if (len < INPUT_DEADZONE) {
    p.walking = false;
    resetPush(world);
    return;
  }
  if (len > 1) {
    mx /= len;
    my /= len;
  }
  p.walking = true;
  p.walkTime += dt;
  p.dir = Math.abs(mx) > Math.abs(my) ? (mx > 0 ? "right" : "left") : my > 0 ? "down" : "up";

  const dx = mx * PLAYER_SPEED * dt;
  const dy = my * PLAYER_SPEED * dt;

  // 앞에 눈덩이가 있으면 민다
  const touched = findStackAt(world, p.x + dx, p.y + dy, PLAYER_RADIUS);
  if (touched && movingToward(p, touched, mx, my)) {
    if (isLoose(touched)) {
      pushBall(world, touched, dx, dy, mx, my, dt, events);
    } else {
      touched.wobble = Math.max(touched.wobble, 0.15);
      resetPush(world);
    }
    return;
  }
  resetPush(world);

  // 막히면 벽을 따라 미끄러지듯 한 축으로만 움직인다
  if (!playerBlocked(world, p.x + dx, p.y + dy, mx, my)) {
    p.x += dx;
    p.y += dy;
  } else if (!playerBlocked(world, p.x + dx, p.y, mx, 0)) {
    p.x += dx;
  } else if (!playerBlocked(world, p.x, p.y + dy, 0, my)) {
    p.y += dy;
  }
}

function pushBall(
  world: World,
  stack: Stack,
  dx: number,
  dy: number,
  mx: number,
  my: number,
  dt: number,
  events: GameEvent[],
): void {
  const ball = stack.balls[0];
  const heaviness = (ball.r - BALL_START_RADIUS) / (BALL_MAX_RADIUS - BALL_START_RADIUS);
  const slow = 1 - HEAVY_BALL_SLOWDOWN * heaviness;
  const bdx = dx * slow;
  const bdy = dy * slow;
  const nx = stack.x + bdx;
  const ny = stack.y + bdy;
  const fr = footRadius(stack);

  if (outOfBounds(world, nx, ny, fr) || hitsObstacle(world, nx, ny, fr)) {
    resetPush(world);
    return;
  }

  const other = findStackAt(world, nx, ny, fr, stack.id);
  if (other) {
    pushIntoStack(world, stack, other, mx, my, dt, events);
    return;
  }

  resetPush(world);
  const moved = Math.hypot(bdx, bdy);
  stack.x = nx;
  stack.y = ny;
  ball.roll += moved;
  ball.r = Math.min(BALL_MAX_RADIUS, ball.r + moved * BALL_GROWTH_PER_PIXEL);
  world.player.x += bdx;
  world.player.y += bdy;
  events.push({ type: "rolled", x: nx, y: ny, r: ball.r });
}

/** 굴리던 눈덩이로 다른 눈덩이/눈사람을 정면으로 계속 밀면 위로 올린다. */
function pushIntoStack(
  world: World,
  stack: Stack,
  other: Stack,
  mx: number,
  my: number,
  dt: number,
  events: GameEvent[],
): void {
  other.wobble = Math.max(other.wobble, 0.1);
  const d = distance(stack.x, stack.y, other.x, other.y) || 1;
  const headOn = ((other.x - stack.x) * mx + (other.y - stack.y) * my) / d > HEAD_ON_THRESHOLD;
  if (!headOn) {
    resetPush(world);
    return;
  }

  const push = world.push;
  if (push.targetId !== other.id) {
    push.targetId = other.id;
    push.time = 0;
    push.warned = false;
  }
  push.time += dt;

  const blocked = other.finished ? "finished" : other.balls.length >= MAX_STACK_HEIGHT ? "full" : null;
  if (!push.warned && push.time > 0.15) {
    push.warned = true;
    events.push(blocked ? { type: "stackBlocked", reason: blocked } : { type: "pushHint" });
  }
  if (!blocked && push.time >= STACK_PUSH_SECONDS) {
    world.stacks = world.stacks.filter((s) => s.id !== stack.id);
    world.lift = { ball: stack.balls[0], fromX: stack.x, fromY: stack.y, targetId: other.id, t: 0 };
    resetPush(world);
  }
}

function stepLift(world: World, dt: number, events: GameEvent[]): void {
  const lift = world.lift;
  if (!lift) return;
  lift.t = Math.min(1, lift.t + dt / LIFT_SECONDS);
  if (lift.t < 1) return;

  world.lift = null;
  const target = world.stacks.find((s) => s.id === lift.targetId);
  if (!target) {
    addStack(world, lift.fromX, lift.fromY, lift.ball);
    return;
  }
  target.balls.push(lift.ball);
  target.wobble = 0.5;
  events.push({ type: "stacked", stackId: target.id, height: target.balls.length });
}

/** 올라가는 중인 눈덩이의 현재 위치(x, y는 땅 위치, h는 높이). 그리기용. */
export function liftPose(world: World): { x: number; y: number; h: number; ball: Ball } | null {
  const lift = world.lift;
  if (!lift) return null;
  const target = world.stacks.find((s) => s.id === lift.targetId);
  if (!target) return null;
  const e = easeInOutCubic(lift.t);
  const top = target.balls[target.balls.length - 1];
  const heights = ballHeights(target);
  const toH = heights[heights.length - 1] + (top.r + lift.ball.r) * STACK_OVERLAP;
  const fromH = lift.ball.r;
  return {
    x: lift.fromX + (target.x - lift.fromX) * e,
    y: lift.fromY + (target.y - lift.fromY) * e,
    h: fromH + (toH - fromH) * e + Math.sin(Math.PI * e) * 14,
    ball: lift.ball,
  };
}

/** 부서진 조각이 날아가는 중일 때의 위치·높이·크기. 그리기용. */
export function popPose(stack: Stack): { x: number; y: number; h: number; r: number } | null {
  const pop = stack.pop;
  if (!pop) return null;
  const t = Math.max(0, pop.t);
  const move = 1 - Math.pow(1 - Math.min(1, t / 0.75), 3);
  const endR = stack.balls[0].r;
  let h: number;
  if (t < 0.75) {
    // 원래 높이에서 위로 튀어 오른 뒤 땅으로 떨어진다
    const u = t / 0.75;
    h = pop.fromH * (1 - u) + endR * u + Math.sin(Math.PI * u) * (10 + pop.fromH * 0.3);
  } else {
    // 땅에 닿고 한 번 작게 통 튄다
    const u = (t - 0.75) / 0.25;
    h = endR + Math.sin(Math.PI * u) * 3;
  }
  return {
    x: pop.fromX + (stack.x - pop.fromX) * move,
    y: pop.fromY + (stack.y - pop.fromY) * move,
    h,
    r: pop.fromR + (endR - pop.fromR) * Math.min(1, t * 2.2),
  };
}

// ---------- 눈사람 완성 / 부수기 ----------

/**
 * 캐릭터 가까이 있는 눈사람(2단 이상). 완성한 눈사람도 포함한다(부수기는 할 수 있으니까).
 * 남의 눈사람은 빼되, 마을 주인(canOpenLetters)에게는 편지가 든 눈사람도 포함한다(편지를 보러 갈 수 있게).
 */
export function findNearbySnowman(world: World, canOpenLetters = false): Stack | null {
  const p = world.player;
  let best: Stack | null = null;
  let bestDist = Infinity;
  for (const s of world.stacks) {
    if (s.balls.length < 2 || s.pop) continue;
    // 남이 만든 눈사람은 조각도 부수기도 못 한다. 마을 주인이 편지를 보러 갈 때만 말풍선을 띄운다.
    if (s.saved && !s.saved.mine && !(canOpenLetters && s.saved.hasLetter)) continue;
    const d = distance(p.x, p.y, s.x, s.y) - footRadius(s) - PLAYER_RADIUS;
    if (d < NEARBY_STACK_DISTANCE && d < bestDist) {
      best = s;
      bestDist = d;
    }
  }
  return best;
}

export function finishStack(world: World, stackId: number, sculpt: Sculpt | null = null): GameEvent[] {
  const stack = world.stacks.find((s) => s.id === stackId);
  if (!stack || stack.finished || stack.balls.length < 2) return [];
  stack.finished = true;
  stack.sculpt = sculpt;
  stack.wobble = 0.4;
  return [{ type: "finished", stackId }];
}

/**
 * 눈사람을 부수면 눈덩이 개수만큼 처음 크기의 작은 눈덩이로 주변에 흩어진다.
 * 완성(조각)한 눈사람도 부술 수 있지만, 저장된 남의 눈사람은 부술 수 없다.
 */
export function breakStack(world: World, stackId: number): GameEvent[] {
  if (world.lift) return [];
  const stack = world.stacks.find((s) => s.id === stackId);
  if (!stack || (stack.saved && !stack.saved.mine)) return [];

  world.stacks = world.stacks.filter((s) => s.id !== stackId);
  const heights = ballHeights(stack);
  const spread = stack.balls[0].r;
  stack.balls.forEach((ball, i) => {
    const spot =
      findFreeSpot(world, BALL_START_RADIUS, { center: stack, minDist: spread * 0.6, maxDist: spread + 22 }) ??
      stack;
    const piece = addStack(world, spot.x, spot.y, newBall());
    // 원래 있던 높이·크기에서 출발해 날아가며 작은 눈덩이로 줄어든다. 위쪽 조각일수록 살짝 늦게 출발.
    piece.pop = { fromX: stack.x, fromY: stack.y, fromH: heights[i], fromR: ball.r, t: -i * 0.06 };
  });
  return [
    {
      type: "broken",
      stackId,
      x: stack.x,
      y: stack.y,
      height: stack.sculpt ? stack.sculpt.height : stackTopHeight(stack),
      r: stack.balls[0].r,
      savedId: stack.saved?.rowId ?? null,
    },
  ];
}

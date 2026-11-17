// 게임 루프. 입력 → 규칙(step) → 그리기를 매 프레임 반복하고, React 쪽에 알릴 일을 콜백으로 넘긴다.

import { sculptFromBalls, type Sculpt } from "@/domains/snowman";
import type { SavedSnowman, SnowmanDraft } from "../types";
import { BREAK_HOLD_SECONDS, HIT_STOP_SECONDS } from "./constants";
import { distance, easeInOutCubic } from "./geometry";
import { createInput } from "./input";
import {
  CELEBRATE_SECONDS,
  createRenderer,
  type CameraFocus,
  type HammerView,
  type ScreenPad,
} from "./render";
import { ballHeights, breakStack, findNearbySnowman, finishStack, stackTopHeight, step } from "./rules";
import type { GameEvent, Stack } from "./types";
import { createWorld, MAILBOX_POSITION } from "./world";

/**
 * 근처 눈사람. finished면 조각은 끝났고, mine이면 부술 수 있다.
 * hasLetter면 편지가 들어 있다(마을 주인은 남의 눈사람이라도 편지를 보러 다가갈 수 있다).
 */
export type NearbySnowman = {
  id: number;
  height: number;
  finished: boolean;
  mine: boolean;
  hasLetter: boolean;
  authorName: string | null;
  /** 저장된 눈사람이면 그 저장 ID (편지를 찾는 데 쓴다) */
  savedId: string | null;
};

export type VillageGameOptions = {
  canvas: HTMLCanvasElement;
  /** 마을에 이미 저장된 눈사람들 */
  saved?: readonly SavedSnowman[];
  /** 내 계정 ID (내가 만든 눈사람인지 가리는 데 쓴다) */
  myId?: string | null;
  /** 마을 주인이면 true: 편지가 든 눈사람에 다가가면 편지 버튼이 뜬다 */
  isOwner?: boolean;
  onEvent?: (event: GameEvent) => void;
  onNearbyChange?: (snowman: NearbySnowman | null) => void;
  /** 마을 주인이 우체통 가까이 왔는지 (바뀔 때만 알린다) */
  onMailboxNearChange?: (near: boolean) => void;
};

/** 조각을 시작할 눈사람과, 쌓은 모양 그대로 만든 조각 재료 */
export type SculptSeed = { stackId: number; sculpt: Sculpt };

export type VillageGame = {
  /** 근처 눈사람으로 조각을 시작한다. 카메라가 눈사람 쪽으로 확대되고 게임은 멈춘다. */
  startSculpt(): SculptSeed | null;
  /** 조각 화면에서 모양이 바뀔 때마다 알려 준다 (마을 화면에 바로 그린다) */
  updateSculpt(sculpt: Sculpt): void;
  /** 화면 좌표(clientX, clientY)가 조각의 몇 번째 칸인지 */
  sculptCellAt(clientX: number, clientY: number): { x: number; y: number } | null;
  /** 조각을 마치고 눈사람을 완성한다. 카메라가 다시 마을로 돌아간다. */
  finishSculpt(stackId: number, sculpt: Sculpt): void;
  /** 조각을 그만두고 게임으로 돌아간다 */
  cancelSculpt(): void;
  /** 완성한 눈사람을 저장할 모양으로 꺼낸다 */
  exportSnowman(stackId: number): SnowmanDraft | null;
  /** 저장이 끝난 눈사람에 저장 ID와 이름을 붙인다 (이름표가 생기고, 부수면 저장된 것도 지운다) */
  markSaved(stackId: number, rowId: string, authorName: string, hasLetter: boolean): void;
  breakNearby(): void;
  /**
   * 근처 눈사람 머리 위에 띄울 화면 요소를 알려 준다. 엔진이 매 프레임 이 요소를 눈사람 위로 옮긴다.
   * (카메라가 계속 움직이니 React state 대신 엔진이 직접 위치만 바꾼다)
   */
  setNearbyAnchor(el: HTMLElement | null): void;
  /** 우체통에 모인 편지 수 (깃발 올리기) */
  setMailCount(count: number): void;
  /** 부수기 버튼을 누르기 시작하면 true, 떼면 false. 누르는 동안 눈사람이 떨리고 금이 간다. */
  setBreakCharging(charging: boolean): void;
  destroy(): void;
};

/** 한 프레임이 너무 길면(탭 전환 등) 순간이동하지 않게 자른다 */
const MAX_FRAME_SECONDS = 0.05;
/** 부수기 버튼을 누르는 동안 망치를 내리치는 횟수. 마지막 한 방에 부서진다. */
const HAMMER_SWINGS = 3;
/** 부서진 뒤 망치를 내리친 자세로 잠깐 멈춰 있는 시간 */
const HAMMER_FOLLOW_THROUGH_SECONDS = 0.3;
/** 조각을 시작/끝낼 때 카메라가 확대/축소되는 시간 */
const ZOOM_SECONDS = 0.5;
/** 조각 중 위아래에 떠 있는 버튼을 피할 여백 (CSS px) */
const SCULPT_PAD: ScreenPad = { top: 84, bottom: 96, side: 28 };

export function createVillageGame({
  canvas,
  saved = [],
  myId = null,
  isOwner = false,
  onEvent,
  onNearbyChange,
  onMailboxNearChange,
}: VillageGameOptions): VillageGame {
  const world = createWorld(saved, myId);
  // 개발 중 브라우저 콘솔에서 상태를 들여다보기 위한 손잡이 (배포 빌드에는 들어가지 않는다)
  if (process.env.NODE_ENV === "development") Object.assign(window, { __degulWorld: world });
  const input = createInput(canvas);
  const renderer = createRenderer(canvas, world.width, world.height);

  const resize = () => {
    renderer.resize(canvas.clientWidth, canvas.clientHeight, Math.min(window.devicePixelRatio || 1, 2));
  };
  resize();
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);

  let nearbyKey = "";
  let chargeStart: number | null = null;
  let hitStop = 0;
  let followThrough = 0;
  let hammerDir: HammerView["dir"] = "right";

  // 조각 상태: editing이 있으면 확대해서 조각 중, zoom은 0(마을)~1(확대) 사이로 부드럽게 움직인다
  let editing: { stackId: number; sculpt: Sculpt; version: number } | null = null;
  let zoom = 0;
  let lastFocus: CameraFocus | null = null;
  let nearbyAnchor: HTMLElement | null = null;
  let lastMailboxNear = false;
  let mailCount = 0;
  // 완성 축하: 완성되면 기다렸다가(pending) 카메라가 마을로 다 돌아오면 시작한다
  let pendingCelebrate: number | null = null;
  let celebrate: { stackId: number; start: number } | null = null;

  /** 눈사람 머리 꼭대기 바로 위에 요소를 띄운다. 화면 밖으로 나가지 않게 가장자리에서 멈춘다. */
  const placeAnchor = (x: number, topY: number) => {
    const el = nearbyAnchor;
    if (!el) return;
    const p = renderer.toScreen(x, topY - 2);
    const { width, height } = renderer.size();
    const margin = 8;
    const sx = Math.min(Math.max(p.x, el.offsetWidth / 2 + margin), width - el.offsetWidth / 2 - margin);
    const sy = Math.min(Math.max(p.y, el.offsetHeight + margin), height - margin);
    el.style.transform = `translate(${Math.round(sx)}px, ${Math.round(sy)}px) translate(-50%, -100%)`;
    el.style.opacity = "1";
  };
  /** 눈사람 머리 꼭대기 바로 위에 말풍선을 띄운다 */
  const placeAnchorOnStack = (stack: Stack) =>
    placeAnchor(stack.x, stack.sculpt ? stack.y - stack.sculpt.height : stack.y - stackTopHeight(stack));

  const findStack = (id: number): Stack | undefined => world.stacks.find((s) => s.id === id);

  /** 조각 칸 (0, 0)이 마을의 어느 픽셀에 그려지는지 (render.ts와 같은 반올림) */
  const sculptOrigin = (stack: Stack, sculpt: Sculpt) => ({
    x: Math.round(stack.x - sculpt.originX),
    y: Math.round(stack.y - (sculpt.height - 1)),
  });

  const emit = (events: GameEvent[]) => {
    for (const event of events) {
      if (event.type === "rolled") {
        renderer.paintTrail(event.x, event.y, event.r);
        continue;
      }
      if (event.type === "broken") {
        renderer.burst(event.x, event.y, event.height, event.r);
        hitStop = HIT_STOP_SECONDS;
        followThrough = HAMMER_FOLLOW_THROUGH_SECONDS;
        if ("vibrate" in navigator) navigator.vibrate(40);
      }
      if (event.type === "finished") pendingCelebrate = event.stackId;
      onEvent?.(event);
    }
  };

  let rafId = 0;
  let last = performance.now();
  const frame = (now: number) => {
    const dt = Math.min(MAX_FRAME_SECONDS, (now - last) / 1000);
    last = now;

    zoom = editing ? Math.min(1, zoom + dt / ZOOM_SECONDS) : Math.max(0, zoom - dt / ZOOM_SECONDS);
    const sculptMode = editing !== null || zoom > 0;

    if (sculptMode) {
      // 조각 중에는 걷지 않는다. 눈은 계속 내리도록 시간만 흐르게 한다.
      world.time += dt;
      world.player.walking = false;
    } else if (hitStop > 0) {
      // 히트스톱: 부서지는 순간 아주 잠깐 멈춰서 "쾅"하는 느낌을 준다
      hitStop -= dt;
    } else {
      emit(step(world, input.read(), dt));
    }

    // 조각 중이거나 완성 축하 중에는 말풍선을 띄우지 않는다 ("완성!" 글자를 가리지 않게)
    const celebrating = celebrate !== null || pendingCelebrate !== null;
    const nearby = sculptMode || celebrating || world.lift ? null : findNearbySnowman(world, isOwner);
    // 마을 주인이 우체통 가까이 오면 (눈사람 말풍선이 없을 때만) 우체통 위에 말풍선을 띄운다
    const mailboxNear =
      isOwner &&
      !nearby &&
      !sculptMode &&
      !celebrating &&
      distance(world.player.x, world.player.y, MAILBOX_POSITION.x, MAILBOX_POSITION.y) < 20;
    if (mailboxNear !== lastMailboxNear) {
      lastMailboxNear = mailboxNear;
      onMailboxNearChange?.(mailboxNear);
    }
    const key = nearby
      ? `${nearby.id}:${nearby.balls.length}:${nearby.finished}:${nearby.saved?.rowId ?? ""}:${nearby.saved?.hasLetter ?? false}`
      : "";
    if (key !== nearbyKey) {
      nearbyKey = key;
      onNearbyChange?.(
        nearby
          ? {
              id: nearby.id,
              height: nearby.balls.length,
              finished: nearby.finished,
              mine: !nearby.saved || nearby.saved.mine,
              hasLetter: nearby.saved?.hasLetter ?? false,
              authorName: nearby.saved?.authorName ?? null,
              savedId: nearby.saved?.rowId ?? null,
            }
          : null,
      );
    }

    let charge: { id: number; progress: number } | null = null;
    let hammer: HammerView | null = null;
    if (nearby && chargeStart !== null) {
      const progress = Math.min(1, (now - chargeStart) / 1000 / BREAK_HOLD_SECONDS);
      nearby.wobble = Math.max(nearby.wobble, 0.15 + progress * 0.5);
      charge = { id: nearby.id, progress };
      // 눈사람이 있는 쪽(상하좌우 중 가까운 쪽)을 보고, 들어 올림 → 휘두름 → 내리침을 반복한다
      const dx = nearby.x - world.player.x;
      const dy = nearby.y - world.player.y;
      hammerDir = Math.abs(dx) >= Math.abs(dy) ? (dx >= 0 ? "right" : "left") : dy >= 0 ? "down" : "up";
      world.player.dir = hammerDir;
      const phase = (progress * HAMMER_SWINGS) % 1;
      hammer = { pose: phase < 0.55 ? "up" : phase < 0.75 ? "mid" : "down", dir: hammerDir };
    } else if (followThrough > 0) {
      followThrough -= dt;
      hammer = { pose: "down", dir: hammerDir };
    }

    // 조각 중이면 눈사람이 버튼 사이 빈 공간에 꽉 차게 카메라를 맞춘다 (화면 크기가 바뀌어도 따라가도록 매번)
    const editStack = editing ? findStack(editing.stackId) : undefined;
    if (editing && editStack) {
      const o = sculptOrigin(editStack, editing.sculpt);
      lastFocus = renderer.focusOn({ x: o.x, y: o.y, w: editing.sculpt.width, h: editing.sculpt.height }, SCULPT_PAD);
    }

    if (pendingCelebrate !== null && zoom === 0) {
      celebrate = { stackId: pendingCelebrate, start: world.time };
      pendingCelebrate = null;
      // 화면 쪽(아래)을 보고 뛴다
      world.player.dir = "down";
      if ("vibrate" in navigator) navigator.vibrate([20, 60, 20]);
    }
    if (celebrate && world.time - celebrate.start > CELEBRATE_SECONDS) celebrate = null;

    renderer.draw(world, {
      celebrate: celebrate ? { stackId: celebrate.stackId, t: world.time - celebrate.start } : null,
      joystick: sculptMode ? null : input.joystick(),
      mailCount,
      highlightId: nearby?.id ?? null,
      charge,
      hammer,
      focus: lastFocus && zoom > 0 ? { ...lastFocus, t: easeInOutCubic(zoom) } : null,
      editing,
    });
    if (nearby) placeAnchorOnStack(nearby);
    else if (mailboxNear) placeAnchor(MAILBOX_POSITION.x + 1, MAILBOX_POSITION.y - 18);
    rafId = requestAnimationFrame(frame);
  };
  rafId = requestAnimationFrame(frame);

  const withNearby = (action: (id: number) => GameEvent[]) => {
    const nearby = findNearbySnowman(world);
    if (nearby) emit(action(nearby.id));
  };

  return {
    startSculpt() {
      const nearby = findNearbySnowman(world);
      if (!nearby || nearby.finished || world.lift || editing) return null;
      chargeStart = null;
      const sculpt = sculptFromBalls(nearby.balls, ballHeights(nearby));
      nearby.wobble = 0;
      editing = { stackId: nearby.id, sculpt, version: 0 };
      return { stackId: nearby.id, sculpt };
    },
    updateSculpt(sculpt) {
      if (!editing) return;
      editing = { ...editing, sculpt, version: editing.version + 1 };
    },
    sculptCellAt(clientX, clientY) {
      const stack = editing ? findStack(editing.stackId) : undefined;
      if (!editing || !stack) return null;
      const rect = canvas.getBoundingClientRect();
      const p = renderer.toWorld(clientX - rect.left, clientY - rect.top);
      const o = sculptOrigin(stack, editing.sculpt);
      return { x: Math.floor(p.x - o.x), y: Math.floor(p.y - o.y) };
    },
    finishSculpt(stackId, sculpt) {
      editing = null;
      emit(finishStack(world, stackId, sculpt));
    },
    cancelSculpt() {
      editing = null;
    },
    exportSnowman(stackId) {
      const stack = findStack(stackId);
      if (!stack?.sculpt) return null;
      return { x: stack.x, y: stack.y, balls: stack.balls.map((b) => b.r), sculpt: stack.sculpt };
    },
    markSaved(stackId, rowId, authorName, hasLetter) {
      const stack = findStack(stackId);
      if (stack) stack.saved = { rowId, mine: true, authorName, hasLetter };
    },
    breakNearby: () => {
      chargeStart = null;
      withNearby((id) => breakStack(world, id));
    },
    setMailCount(count) {
      mailCount = count;
    },
    setNearbyAnchor(el) {
      nearbyAnchor = el;
    },
    setBreakCharging(charging) {
      chargeStart = charging ? performance.now() : null;
    },
    destroy() {
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      input.destroy();
    },
  };
}

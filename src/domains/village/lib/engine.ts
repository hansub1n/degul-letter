// 게임 루프. 입력 → 규칙(step) → 그리기를 매 프레임 반복하고, React 쪽에 알릴 일을 콜백으로 넘긴다.

import { sculptFromBalls, type Sculpt } from "@/domains/snowman";
import type { SavedSnowman, SnowmanDraft } from "../types";
import { BALL_START_RADIUS, BREAK_HOLD_SECONDS, HIT_STOP_SECONDS } from "./constants";
import { distance, easeInOutCubic } from "./geometry";
import { createInput } from "./input";
import {
  CELEBRATE_SECONDS,
  createRenderer,
  type CameraFocus,
  type HammerView,
  type ScreenPad,
} from "./render";
import { addStack, ballHeights, breakStack, findNearbySnowman, finishStack, footRadius, stackHeadY, step } from "./rules";
import type { StoryCardSnowman } from "./storyCard";
import type { GameEvent, Stack } from "./types";
import { createWorld, HOUSE_POSITION, MAILBOX_POSITION } from "./world";

/** 캐릭터가 집 벽에서 이만큼 안으로 오면 집 말풍선을 띄운다 (집 충돌 원 바깥 거리, 게임 픽셀) */
const HOUSE_TOUCH = 10;

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
  /** 마을 주인이 집 문 앞에 왔는지 (로그아웃 말풍선) */
  onDoorNearChange?: (near: boolean) => void;
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
  /** 마을 주인이 숨기거나 다시 보이게 한 눈사람을 화면에 맞춘다 (숨겨도 그 자리는 그대로 막힌다) */
  setSnowmanHidden(rowId: string, hidden: boolean): void;
  /** 마을에 저장되어 서 있는 눈사람들 (스토리 카드에 그릴 재료. 편지 내용은 들어 있지 않다) */
  storySnowmen(): StoryCardSnowman[];
  /**
   * 근처 눈사람 머리 위에 띄울 화면 요소를 알려 준다. 엔진이 매 프레임 이 요소를 눈사람 위로 옮긴다.
   * (카메라가 계속 움직이니 React state 대신 엔진이 직접 위치만 바꾼다)
   */
  setNearbyAnchor(el: HTMLElement | null): void;
  /** 화면 위쪽 표지판·버튼 층 (말풍선이 피하고, 카메라가 그 아래까지 내려 보여 준다) */
  setHeaderLayer(el: HTMLElement | null): void;
  /** 편지 안 넣은 눈사람 머리 위 봉투를 담는 층. 엔진이 매 프레임 위치를 옮긴다 */
  setUnsentMarkerLayer(el: HTMLElement | null): void;
  /** 완성했지만 아직 편지를 넣지 않은 눈사람 ID */
  setUnsentIds(ids: readonly number[]): void;
  /** 우체통에 모인 편지 수 (깃발 올리기) */
  setMailCount(count: number): void;
  /** 부수기 버튼을 누르기 시작하면 true, 떼면 false. 누르는 동안 눈사람이 떨리고 금이 간다. */
  setBreakCharging(charging: boolean): void;
  /** 아직 저장하지 않은 눈사람을 만드는 중인지 (굴리기·쌓기·조각, 완성 후 미저장) */
  hasUnsavedWork(): boolean;
  /** 안내: 데굴이가 말할 때 살짝 들썩이게 할 물건 (화살표 없이 물건이 움직여서 알려 준다) */
  setGuide(target: GuideTarget | null): void;
  /** 데굴이 머리 위 말풍선 층. 엔진이 매 프레임 캐릭터 위로 옮긴다 */
  setSpeechLayer(el: HTMLElement | null): void;
  /** 처음 온 사람 안내 진행: 굴려 키운 눈덩이 수, 2단 이상 쌓았는지 */
  guideProgress(): { walked: boolean; grown: number; stacked: boolean; finished: boolean };
  /** 캐릭터가 화면 아래쪽 절반에 있는지 (알림을 캐릭터 반대쪽에 띄우려고 쓴다) */
  playerInLowerHalf(): boolean;
  /** 눈사람 가슴께의 화면 위치 (CSS px, 캔버스 기준). 편지 봉투가 날아갈 곳 */
  stackChestScreen(stackId: number): { x: number; y: number } | null;
  destroy(): void;
};

/**
 * 안내가 가리키는 물건. 눈덩이·눈사람은 노란 점선 동그라미, 우체통·집은 톡 뛰는 움직임으로 알려 준다.
 * ball: 처음 굴릴 눈덩이, ball2: 하나 더 굴릴 눈덩이, stack: 쌓을 곳(굴린 눈덩이 중 큰 것), built: 쌓은 눈사람
 */
export type GuideTarget = "ball" | "ball2" | "stack" | "built" | "write" | "mailbox" | "house";
/** 이만큼 커지면 "굴렸다"로 본다 (처음 반지름 4에서 조금만 굴려도 넘어가게) */
const GUIDE_ROLLED_RADIUS = BALL_START_RADIUS + 1.5;
/** 가리키던 눈덩이에서 이만큼 멀어지면 가까운 눈덩이로 표시를 옮긴다 (게임 픽셀) */
const GUIDE_KEEP_DISTANCE = 70;

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
  onDoorNearChange,
}: VillageGameOptions): VillageGame {
  const world = createWorld(saved, myId);
  /** 손가락 안내를 거둘 때 쓰는 처음 자리 */
  const guideStart = { x: world.player.x, y: world.player.y };
  // 개발 중 브라우저 콘솔에서 상태를 들여다보기 위한 손잡이 (배포 빌드에는 들어가지 않는다)
  if (process.env.NODE_ENV === "development") Object.assign(window, { __degulWorld: world });
  const input = createInput(canvas);
  const renderer = createRenderer(canvas, world.width, world.height);

  const resize = () => {
    // 숨긴 화면(Activity)에서는 칸 크기가 0이 된다. 그때 캔버스를 비우면,
    // 다시 들어왔을 때 관찰자가 한 번 더 알리지 않으면 눈 밭만 남을 수 있다.
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (w <= 0 || h <= 0) return;
    renderer.resize(w, h, Math.min(window.devicePixelRatio || 1, 2));
  };
  resize();
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  const onShow = () => resize();
  window.addEventListener("resize", onShow);
  window.addEventListener("pageshow", onShow);
  document.addEventListener("visibilitychange", onShow);
  const firstShowFrame = requestAnimationFrame(onShow);

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
  let unsentMarkerLayer: HTMLElement | null = null;
  let unsentIds: readonly number[] = [];
  let lastMailboxNear = false;
  let lastDoorNear = false;
  let mailCount = 0;
  let guideTarget: GuideTarget | null = null;
  let speechLayer: HTMLElement | null = null;
  /** 안내가 가리키는 눈덩이·눈사람. 정해 두면 캐릭터가 움직여도 다른 눈덩이로 옮겨 가지 않는다 */
  let guideStackId: number | null = null;
  /** 안내 1단계에서 처음 굴린 눈덩이. 3단계 "아까 밀었던 눈덩이 쪽으로"가 이 눈덩이를 가리킨다 */
  let firstBallId: number | null = null;
  // 완성 축하: 완성되면 기다렸다가(pending) 카메라가 마을로 다 돌아오면 시작한다
  let pendingCelebrate: number | null = null;
  let celebrate: { stackId: number; start: number } | null = null;

  /** 화면 위쪽의 마을 이름 표지판·버튼을 담은 층. 이 칸들은 말풍선이 피해야 하고, 카메라도 그 아래까지 내려 보여 준다 */
  let headerLayer: HTMLElement | null = null;
  type Box = { left: number; right: number; top: number; bottom: number };
  /** 표지판·버튼 하나하나의 네모 (캔버스 기준 CSS px) */
  const headerBoxes = (): Box[] => {
    const row = headerLayer?.firstElementChild;
    if (!row) return [];
    const base = canvas.getBoundingClientRect();
    return Array.from(row.children, (c) => {
      const r = c.getBoundingClientRect();
      return { left: r.left - base.left, right: r.right - base.left, top: r.top - base.top, bottom: r.bottom - base.top };
    }).filter((b) => b.right > b.left && b.bottom > b.top);
  };
  const overlaps = (a: Box, b: Box) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

  /**
   * 요소를 마을 좌표 (x, topY) 바로 위에 띄운다. 화면 밖으로 나가지 않게 가장자리에서 멈춘다.
   * belowY가 있으면: 위쪽에 자리가 모자랄 때(마을 맨 위 모서리 등) 그 지점 아래로 내려 띄운다.
   * 위로 밀어 올리다 보면 말풍선이 눈사람·캐릭터를 덮거나 표지판 뒤로 숨기 때문이다.
   */
  /** 안내가 가리킬 물건. 눈덩이·눈사람은 Stack, 우체통·집은 이름 */
  const pickGuide = (): Stack | "mailbox" | "house" | null => {
    if (guideTarget === "mailbox" || guideTarget === "house") return guideTarget;
    const kept = world.stacks.find((s) => s.id === guideStackId && !s.saved && !s.pop);
    const p = world.player;
    const mine = world.stacks.filter((s) => !s.saved && !s.finished && !s.pop);
    const loose = mine.filter((s) => s.balls.length === 1);
    const closest = (list: Stack[], x: number, y: number) =>
      list.reduce<Stack | null>((best, s) => (!best || distance(x, y, s.x, s.y) < distance(x, y, best.x, best.y) ? s : best), null);
    const grown = loose.filter((s) => s.balls[0].r >= GUIDE_ROLLED_RADIUS);
    const fresh = loose.filter((s) => s.balls[0].r < GUIDE_ROLLED_RADIUS);
    // 1단계에서 가리키던 눈덩이가 커지면 그게 "처음 굴린 눈덩이"다 (3단계에서 다시 가리킨다)
    if (guideTarget === "ball" && kept && grown.includes(kept)) firstBallId = kept.id;
    let pick: Stack | null = null;
    if (guideTarget === "ball" || guideTarget === "ball2") {
      // 가리키던 눈덩이에서 멀리 떠나면(우체통·집 구경 등) 지금 자리에서 가장 가까운 눈덩이로 옮긴다 (화면 밖 눈덩이를 "이 눈덩이"라 부르지 않게)
      const keep = kept && fresh.includes(kept) && distance(kept.x, kept.y, p.x, p.y) < GUIDE_KEEP_DISTANCE;
      pick = keep ? kept : closest(fresh, p.x, p.y);
    }
    // 쌓을 곳: 굴린 눈덩이 중 가장 큰 것 (다른 눈덩이를 여기에 밀면 위로 올라간다)
    if (guideTarget === "stack") {
      const first = grown.find((s) => s.id === firstBallId);
      pick = first ?? grown.reduce<Stack | null>((b, s) => (!b || s.balls[0].r > b.balls[0].r ? s : b), null);
    }
    if (guideTarget === "built") pick = mine.find((s) => s.balls.length > 1) ?? null;
    if (guideTarget === "write") pick = world.stacks.find((s) => !s.saved && s.finished) ?? null;
    guideStackId = pick?.id ?? null;
    return pick;
  };
  /** 안내 첫마디: 데굴이 바로 옆에 굴릴 눈덩이가 없으면 하나 놓아 둔다 (멀리 찾아가지 않아도 바로 밀어 볼 수 있게) */
  const placeBallNearPlayer = () => {
    const p = world.player;
    const near = world.stacks.some(
      (s) => !s.saved && s.balls.length === 1 && !s.finished && distance(s.x, s.y, p.x, p.y) < 26,
    );
    if (near) return;
    const r = BALL_START_RADIUS;
    for (const [dx, dy] of [[16, 2], [-16, 2], [0, 16], [14, 12], [-14, 12]]) {
      const x = p.x + dx;
      const y = p.y + dy;
      if (x < r || y < r || x > world.width - r || y > world.height - r) continue;
      if (world.obstacles.some((ob) => distance(x, y, ob.x, ob.y) < r + ob.r + 2)) continue;
      if (world.ballFree.some((z) => distance(x, y, z.x, z.y) < r + z.r)) continue;
      if (world.stacks.some((s) => distance(x, y, s.x, s.y) < r + footRadius(s) + 4)) continue;
      addStack(world, x, y, { r, roll: 0 });
      return;
    }
  };
  /** 데굴이 말풍선을 캐릭터 머리 위에 띄운다 */
  // 눈사람·우체통·집 말풍선(버튼)이 머리 위에 떠 있으면 가리지 않게 데굴이 발밑으로 내린다
  const placeSpeech = (hidden: boolean, below: boolean) => {
    const el = speechLayer;
    if (!el) return;
    if (hidden) {
      el.style.opacity = "0";
      return;
    }
    const { width, height } = renderer.size();
    const margin = 8;
    const p = renderer.toScreen(world.player.x, below ? world.player.y + 4 : world.player.y - 16);
    const sx = Math.min(Math.max(p.x, el.offsetWidth / 2 + margin), width - el.offsetWidth / 2 - margin);
    el.dataset.below = below ? "1" : "";
    el.style.transform = below
      ? `translate(${Math.round(sx)}px, ${Math.round(Math.min(p.y, height - el.offsetHeight - margin))}px) translate(-50%, 0)`
      : `translate(${Math.round(sx)}px, ${Math.round(Math.max(p.y, el.offsetHeight + margin))}px) translate(-50%, -100%)`;
    el.style.opacity = "1";
  };
  const placeAnchor = (x: number, topY: number, belowY?: number) => {
    const el = nearbyAnchor;
    if (!el) return;
    const p = renderer.toScreen(x, topY - 2);
    const { width, height } = renderer.size();
    const margin = 8;
    const sx = Math.min(Math.max(p.x, el.offsetWidth / 2 + margin), width - el.offsetWidth / 2 - margin);
    const above: Box = { left: sx - el.offsetWidth / 2, right: sx + el.offsetWidth / 2, top: p.y - el.offsetHeight, bottom: p.y };
    if (belowY !== undefined && (above.top < margin || headerBoxes().some((b) => overlaps(above, b)))) {
      const below = renderer.toScreen(x, belowY);
      const sy = Math.min(below.y, height - el.offsetHeight - margin);
      el.style.transform = `translate(${Math.round(sx)}px, ${Math.round(sy)}px) translate(-50%, 0)`;
    } else {
      const sy = Math.min(Math.max(p.y, el.offsetHeight + margin), height - margin);
      el.style.transform = `translate(${Math.round(sx)}px, ${Math.round(sy)}px) translate(-50%, -100%)`;
    }
    el.style.opacity = "1";
  };
  /** 눈사람 머리 꼭대기 바로 위에 말풍선을 띄운다. 위쪽 자리가 모자라면 발밑 이름표 아래로 내린다 */
  // 말풍선은 실제로 눈이 있는 머리 꼭대기에서 4칸 더 위에 띄운다 (조각 틀 위쪽 빈 여백 높이는 빼야 크기마다 위치가 들쭉날쭉하지 않다)
  // 아래로 내릴 때는 눈사람 발밑 이름표와, 그 앞에 선 캐릭터까지 피해서 둘 다 보이게 한다
  const placeAnchorOnStack = (stack: Stack) =>
    placeAnchor(stack.x, stackHeadY(stack) - 4, Math.max(stack.y + 10, world.player.y + 6));

  const findStack = (id: number): Stack | undefined => world.stacks.find((s) => s.id === id);

  /** 편지 안 넣은 눈사람 위에 봉투 표시를 붙인다. "편지 쓰기" 말풍선이 떠 있으면 겹치지 않게 숨긴다. */
  const placeUnsentMarkers = (nearby: Stack | null, hideAll: boolean) => {
    const layer = unsentMarkerLayer;
    if (!layer) return;
    const writeBubbleOn =
      nearby != null && nearby.finished && !nearby.saved && unsentIds.includes(nearby.id);
    const { width, height } = renderer.size();
    for (const el of layer.querySelectorAll<HTMLElement>("[data-unsent-id]")) {
      const id = Number(el.dataset.unsentId);
      const stack = Number.isFinite(id) ? findStack(id) : undefined;
      if (!stack || hideAll || (writeBubbleOn && nearby!.id === id)) {
        el.style.opacity = "0";
        continue;
      }
      // 머리 꼭대기에서 2칸 위에 봉투 아래가 오게 한다. 조각 위 빈 여백은 stackHeadY가 빼 둔다.
      const p = renderer.toScreen(stack.x, stackHeadY(stack) - 2);
      if (p.x < -16 || p.x > width + 16 || p.y < -16 || p.y > height + 16) {
        el.style.opacity = "0";
        continue;
      }
      el.style.transform = `translate(${Math.round(p.x)}px, ${Math.round(p.y)}px) translate(-50%, -100%)`;
      el.style.opacity = "1";
    }
  };

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
    // 우체통·집 가까이 오면 (눈사람 말풍선이 없을 때만) 그 위에 말풍선을 띄운다. 주인·방문자 모두.
    // 무엇을 할지(우체통 열기·로그아웃 / 우체통 안내·첫 화면으로)는 화면 쪽이 정한다.
    // 집은 문 앞뿐 아니라 뒤·옆 어디서 붙어도 지붕 위 말풍선이 뜬다 (문 앞이 눈덩이로 막혀도 갈 수 있게).
    // 우체통은 집 바로 옆이라, 우체통에 아주 가까우면 우체통을 먼저 띄운다.
    const spotsOpen = !nearby && !sculptMode && !celebrating;
    const { x: px, y: py } = world.player;
    const toMailbox = distance(px, py, MAILBOX_POSITION.x, MAILBOX_POSITION.y);
    const toHouse = Math.min(
      ...world.obstacles.filter((ob) => ob.kind === "house").map((ob) => distance(px, py, ob.x, ob.y) - ob.r),
    );
    const mailboxNear = spotsOpen && toMailbox < 20 && (toMailbox < 14 || toHouse >= HOUSE_TOUCH);
    const doorNear = spotsOpen && !mailboxNear && toHouse < HOUSE_TOUCH;
    if (doorNear !== lastDoorNear) {
      lastDoorNear = doorNear;
      onDoorNearChange?.(doorNear);
    }
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
    if (celebrate && world.time - celebrate.start > CELEBRATE_SECONDS) {
      const done = celebrate.stackId;
      celebrate = null;
      emit([{ type: "celebrated", stackId: done }]);
    }

    // 카메라는 표지판·버튼 아래 끝까지 마을 밖을 더 보여 준다 (맨 위 줄이 표지판 뒤에 숨지 않게)
    const boxes = headerBoxes();
    renderer.setTopInset(boxes.length ? Math.max(...boxes.map((b) => b.bottom)) + 8 : 0);
    // 조각으로 위로 키운 눈사람 머리가 마을 맨 위를 넘으면 그만큼 더 보여 준다
    renderer.setContentTop(Math.min(0, ...world.stacks.filter((s) => !s.saved?.hidden).map((s) => stackHeadY(s))) - 2);
    // 안내: 가리킬 눈덩이·눈사람에는 노란 점선 동그라미, 우체통·집은 톡 뛴다
    const guide = guideTarget && !sculptMode && !celebrating ? pickGuide() : null;
    placeSpeech(sculptMode || celebrating, Boolean(nearby) || mailboxNear || doorNear);
    renderer.draw(world, {
      celebrate: celebrate ? { stackId: celebrate.stackId, t: world.time - celebrate.start } : null,
      joystick: sculptMode ? null : input.joystick(),
      mailCount,
      mailBadge: isOwner,
      hop: guide === "mailbox" || guide === "house" ? guide : null,
      guideId: guide && typeof guide === "object" ? guide.id : null,
      highlightId: nearby?.id ?? null,
      charge,
      hammer,
      focus: lastFocus && zoom > 0 ? { ...lastFocus, t: easeInOutCubic(zoom) } : null,
      editing,
    });
    if (nearby) placeAnchorOnStack(nearby);
    else if (mailboxNear) placeAnchor(MAILBOX_POSITION.x + 1, MAILBOX_POSITION.y - 18);
    // 집 말풍선은 지붕(굴뚝) 꼭대기 위에 띄워, 문 앞 캐릭터와 집을 가리지 않는다 (집 그림 맨 윗줄 = 바닥선 - 43)
    else if (doorNear) placeAnchor(HOUSE_POSITION.x, HOUSE_POSITION.y - 44);
    placeUnsentMarkers(nearby, sculptMode || celebrating);
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
      if (stack) stack.saved = { rowId, mine: true, authorName, hasLetter, hidden: false };
    },
    setSnowmanHidden(rowId, hidden) {
      const stack = world.stacks.find((s) => s.saved?.rowId === rowId);
      if (!stack?.saved) return;
      stack.saved.hidden = hidden;
      stack.wobble = 0;
      chargeStart = null;
    },
    storySnowmen() {
      return world.stacks.flatMap((s) =>
        s.finished && s.saved && !s.pop
          ? [
              {
                savedId: s.saved.rowId,
                authorName: s.saved.authorName,
                x: s.x,
                y: s.y,
                balls: s.balls.map((b) => b.r),
                sculpt: s.sculpt,
                // 숨긴 눈사람 표시(owner-moderation)가 있는 쪽에서는 그 값을 따른다
                hidden: (s.saved as { hidden?: boolean }).hidden === true,
              },
            ]
          : [],
      );
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
    setHeaderLayer(el) {
      headerLayer = el;
    },
    setUnsentMarkerLayer(el) {
      unsentMarkerLayer = el;
    },
    setUnsentIds(ids) {
      unsentIds = ids;
    },
    setBreakCharging(charging) {
      chargeStart = charging ? performance.now() : null;
    },
    stackChestScreen(stackId) {
      const stack = findStack(stackId);
      if (!stack) return null;
      // 머리 꼭대기와 발 사이 아래쪽 1/3쯤 (편지를 눈사람 몸에 쏙 넣는 자리)
      const head = stackHeadY(stack);
      return renderer.toScreen(stack.x, stack.y - (stack.y - head) * 0.4);
    },
    playerInLowerHalf() {
      const p = renderer.toScreen(world.player.x, world.player.y);
      return p.y > renderer.size().height / 2;
    },
    setGuide(target) {
      if (target !== guideTarget) guideStackId = null;
      guideTarget = target;
      if (target === "ball") placeBallNearPlayer();
    },
    setSpeechLayer(el) {
      speechLayer = el;
    },
    guideProgress() {
      const mine = world.stacks.filter((s) => !s.saved);
      return {
        // 조금이라도 걸어 보면 첫 화면의 손가락 조이스틱 안내를 거둔다
        walked: distance(world.player.x, world.player.y, guideStart.x, guideStart.y) > 10,
        grown: mine.filter((s) => s.balls.length === 1 && s.balls[0].r >= GUIDE_ROLLED_RADIUS).length,
        stacked: mine.some((s) => s.balls.length > 1 && !s.finished),
        // 완성했지만 아직 편지를 넣지 않은 눈사람 (편지 창을 닫은 경우)
        finished: mine.some((s) => s.finished),
      };
    },
    hasUnsavedWork() {
      if (editing || world.lift) return true;
      // 눈덩이를 조금 굴린 것만으로는 묻지 않는다. 2단 이상 쌓았거나 완성한 눈사람이 있을 때만 "녹아요"를 묻는다
      return world.stacks.some((s) => !s.saved && (s.finished || s.balls.length > 1));
    },
    destroy() {
      cancelAnimationFrame(rafId);
      cancelAnimationFrame(firstShowFrame);
      resizeObserver.disconnect();
      window.removeEventListener("resize", onShow);
      window.removeEventListener("pageshow", onShow);
      document.removeEventListener("visibilitychange", onShow);
      input.destroy();
    },
  };
}

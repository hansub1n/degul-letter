// 마을의 처음 모습: 집, 나무, 캐릭터, 굴릴 눈덩이.

import { sculptFromBalls } from "@/domains/snowman";
import type { SavedSnowman } from "../types";
import { WORLD_HEIGHT, WORLD_WIDTH } from "./constants";
import { addStack, ballHeights, fillLooseBalls } from "./rules";
import type { Obstacle, World } from "./types";

export const HOUSE_POSITION = { x: 240, y: 120 };
/** 집 오른쪽 우체통: 마을에 온 편지가 모두 모이는 곳 */
export const MAILBOX_POSITION = { x: 280, y: 132 };

/** 기본 카메라에서 왼쪽 위 이름 판·오른쪽 위 공유 단추와 겹치지 않게, 윗줄 두 그루([150, 100], [330, 100])는 조금 아래로 두었다. */
export const TREE_POSITIONS: ReadonlyArray<readonly [number, number]> = [
  [44, 60], [88, 104], [36, 170], [70, 250], [40, 330], [92, 420],
  [168, 448], [250, 438], [330, 450], [410, 420], [444, 340], [418, 250],
  [446, 160], [404, 80], [330, 100], [150, 100], [120, 330], [360, 320],
];

function createObstacles(): Obstacle[] {
  const { x, y } = HOUSE_POSITION;
  const house: Obstacle[] = [
    { x, y: y - 10, r: 20, kind: "house" },
    { x: x - 16, y: y - 6, r: 12, kind: "house" },
    { x: x + 16, y: y - 6, r: 12, kind: "house" },
  ];
  const trees: Obstacle[] = TREE_POSITIONS.map(([tx, ty]) => ({ x: tx, y: ty - 2, r: 6, kind: "tree" }));
  const mailbox: Obstacle = { x: MAILBOX_POSITION.x, y: MAILBOX_POSITION.y - 1, r: 4, kind: "tree" };
  return [...house, ...trees, mailbox];
}

/**
 * 마을 처음 모습. 저장된 눈사람(saved)을 먼저 세우고, 남은 빈자리에 굴릴 눈덩이를 뿌린다.
 * myId와 만든 사람이 같으면 내 눈사람이라 부술 수 있다.
 */
export function createWorld(saved: readonly SavedSnowman[] = [], myId: string | null = null): World {
  const world: World = {
    width: WORLD_WIDTH,
    height: WORLD_HEIGHT,
    time: 0,
    player: { x: 240, y: 200, dir: "down", walking: false, walkTime: 0 },
    stacks: [],
    obstacles: createObstacles(),
    lift: null,
    push: { targetId: null, time: 0, warned: false },
    spawnTimer: 0,
    nextId: 1,
  };
  for (const s of saved) {
    if (s.balls.length === 0) continue;
    const [first, ...rest] = s.balls;
    const stack = addStack(world, s.x, s.y, { r: first, roll: 0 });
    for (const r of rest) stack.balls.push({ r, roll: 0 });
    stack.finished = true;
    stack.sculpt = s.sculpt ?? sculptFromBalls(stack.balls, ballHeights(stack));
    stack.saved = {
      rowId: s.id,
      mine: myId !== null && s.authorId === myId,
      authorName: s.authorName,
      hasLetter: s.letterId !== null,
    };
  }
  fillLooseBalls(world, 40);
  return world;
}

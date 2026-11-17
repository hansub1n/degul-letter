// 게임 상태와 이벤트 타입. 이 파일은 DOM을 모른다.

import type { Sculpt } from "@/domains/snowman";

export type Vec = { x: number; y: number };

export type Direction = "up" | "down" | "left" | "right";

/** 눈덩이 하나. roll은 지금까지 굴러간 거리(무늬를 움직이는 데 쓴다). */
export type Ball = { r: number; roll: number };

/** 부서진 눈사람에서 튀어나와 자리를 찾아가는 중인 상태. t는 0→1 진행도(0보다 작으면 출발 전). */
export type Pop = { fromX: number; fromY: number; fromH: number; fromR: number; t: number };

/** 땅 위의 한 자리. 눈덩이 1개면 굴릴 수 있는 눈덩이, 2개 이상이면 눈사람. */
export type Stack = {
  id: number;
  x: number;
  y: number;
  balls: Ball[];
  finished: boolean;
  wobble: number;
  pop: Pop | null;
  /** 완성할 때 조각한 모양. 있으면 눈덩이 대신 이 모양으로 그린다. */
  sculpt: Sculpt | null;
  /** 서버에 저장된 눈사람이면: 저장 ID, 내가 만든 것인지, 만든 사람 이름, 편지가 들어 있는지 */
  saved: { rowId: string; mine: boolean; authorName: string; hasLetter: boolean } | null;
};

export type ObstacleKind = "tree" | "house";

export type Obstacle = { x: number; y: number; r: number; kind: ObstacleKind };

export type Player = {
  x: number;
  y: number;
  dir: Direction;
  walking: boolean;
  walkTime: number;
};

/** 눈덩이가 다른 눈사람 위로 올라가는 중인 상태. t는 0→1 진행도. */
export type Lift = {
  ball: Ball;
  fromX: number;
  fromY: number;
  targetId: number;
  t: number;
};

export type PushState = { targetId: number | null; time: number; warned: boolean };

export type World = {
  width: number;
  height: number;
  time: number;
  player: Player;
  stacks: Stack[];
  obstacles: Obstacle[];
  lift: Lift | null;
  push: PushState;
  spawnTimer: number;
  nextId: number;
};

/** 이동 입력. x, y 모두 -1 ~ 1. */
export type InputState = Vec;

export type GameEvent =
  | { type: "rolled"; x: number; y: number; r: number }
  | { type: "pushHint" }
  | { type: "stackBlocked"; reason: "full" | "finished" }
  | { type: "stacked"; stackId: number; height: number }
  | { type: "broken"; stackId: number; x: number; y: number; height: number; r: number; savedId: string | null }
  | { type: "finished"; stackId: number };

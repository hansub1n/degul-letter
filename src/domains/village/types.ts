import type { Sculpt } from "@/domains/snowman";

export type Village = {
  id: string;
  /** 마을 주인의 닉네임. 화면에는 "○○의 마을"로 보여 주고, 편지는 "○○에게" 쓴다 */
  name: string;
  code: string;
  ownerId: string;
};

/** 마을에 저장된(완성된) 눈사람 */
export type SavedSnowman = {
  id: string;
  authorId: string;
  authorName: string;
  x: number;
  y: number;
  /** 아래부터 눈덩이 반지름 */
  balls: number[];
  sculpt: Sculpt | null;
  /** 이 눈사람에 묻어 둔 편지 ID (내용은 12/25 전까지 아무도 못 읽는다) */
  letterId: string | null;
  /** 마을 주인이 숨긴 눈사람이면 true. 데이터는 그대로 두고 마을 화면에서만 빠진다 */
  hidden: boolean;
};

/** 저장할 눈사람 (엔진에서 꺼낸 모양) */
export type SnowmanDraft = {
  x: number;
  y: number;
  balls: number[];
  sculpt: Sculpt;
};

/** 닉네임(마을 이름·눈사람 이름표·편지 보낸 사람) 최대 글자 수. 이름표가 마을에서 너무 길지 않게 8자 */
export const NICKNAME_MAX = 8;

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
};

/** 저장할 눈사람 (엔진에서 꺼낸 모양) */
export type SnowmanDraft = {
  x: number;
  y: number;
  balls: number[];
  sculpt: Sculpt;
};

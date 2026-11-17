"use client";

import { useSyncExternalStore } from "react";
import { christmasLabel } from "../lib/dday";

const subscribe = () => () => {};

/**
 * 크리스마스 D-day 글자 (예: "D-38"). 오늘 날짜는 브라우저에서만 읽는다.
 * 미리 그려 두는 정적 화면(prerender)에서는 null이라, 그동안은 배지를 그리지 않는다.
 */
export function useChristmasLabel(): string | null {
  return useSyncExternalStore(subscribe, christmasLabel, () => null);
}

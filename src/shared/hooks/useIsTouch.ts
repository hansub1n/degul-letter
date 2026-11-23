"use client";

import { useSyncExternalStore } from "react";

// 주로 터치로 쓰는 화면인지 (휴대폰·태블릿). 마우스로 쓰는 데스크톱은 false.
// 공유 버튼을 휴대폰은 공유 창, 데스크톱은 바로 복사로 나눌 때 쓴다.

const QUERY = "(pointer: coarse)";

function subscribe(onChange: () => void): () => void {
  const media = window.matchMedia(QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

/** 서버에서는 알 수 없어서 false(데스크톱)로 시작한다 */
export function useIsTouch(): boolean {
  return useSyncExternalStore(subscribe, () => window.matchMedia(QUERY).matches, () => false);
}

/** 이벤트 처리처럼 렌더 밖에서 쓸 때 */
export function isTouchScreen(): boolean {
  return typeof window !== "undefined" && window.matchMedia(QUERY).matches;
}

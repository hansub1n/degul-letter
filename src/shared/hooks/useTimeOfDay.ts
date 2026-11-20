"use client";

import { useSyncExternalStore } from "react";

export type TimeOfDay = "day" | "night";

/**
 * 첫 칠 전에 `<html data-time>`을 정하는 인라인 스크립트 (layout.tsx의 <head>에 넣는다).
 * 보는 사람 기기 시계로 18시~6시는 밤이다. 페이지를 열 때 한 번만 정한다.
 * `?time=night` / `?time=day`로 시간과 상관없이 고정해 볼 수 있다.
 */
export const TIME_OF_DAY_SCRIPT = `(function(){try{var q=new URLSearchParams(location.search).get("time");var auto=true;var h=new Date().getHours();var t=q==="night"||q==="day"?q:auto&&(h>=18||h<6)?"night":"day";document.documentElement.dataset.time=t;}catch(e){}})();`;

function read(): TimeOfDay {
  return document.documentElement.dataset.time === "night" ? "night" : "day";
}

function subscribe(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-time"] });
  return () => observer.disconnect();
}

/** 지금 낮인지 밤인지 (`<html data-time>`). 서버에서는 null */
export function useTimeOfDay(): TimeOfDay | null {
  return useSyncExternalStore(subscribe, read, () => null);
}

"use client";

// 친구에게 마을 보내기.
// - 휴대폰(터치 화면): 기본 공유 창(카카오톡·문자·인스타 등)에 "문구 줄바꿈 주소" 글 하나로 보낸다.
//   주소를 url 칸에 따로 넣으면 앱마다 문구 뒤에 줄바꿈 없이 붙여 버려서, 글 안에 직접 줄을 바꿔 넣는다.
// - 데스크톱(마우스 화면)이나 공유 창이 없는 브라우저(앱 안 브라우저 등): 화면이 "공유하기" 팝업(주소 + 복사 버튼)을 띄운다.

import { isTouchScreen } from "@/shared/lib/touchScreen";
import { VILLAGE_SHARE_MESSAGE } from "@/shared/lib/site";

export function villageUrl(code: string): string {
  return `${window.location.origin}/v/${code}`;
}

/**
 * 휴대폰 공유 창을 띄운다. 띄웠으면(또는 사용자가 닫았으면) true.
 * 데스크톱이거나 공유 창을 쓸 수 없으면 false → 공유하기 팝업을 띄운다.
 */
export async function tryNativeShare(code: string): Promise<boolean> {
  if (!isTouchScreen() || typeof navigator.share !== "function") return false;
  try {
    await navigator.share({ text: `${VILLAGE_SHARE_MESSAGE}\n${villageUrl(code)}` });
    return true;
  } catch (e) {
    // 공유 창을 닫은 경우엔 아무것도 하지 않는다. 그 밖의 실패는 팝업으로 대신한다
    return (e as DOMException).name === "AbortError";
  }
}

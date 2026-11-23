"use client";

// 친구에게 마을 보내기. "문구 줄바꿈 주소" 글 하나로 보낸다.
// - 휴대폰(터치 화면): 기본 공유 창(카카오톡·문자·인스타 등). 주소를 url 칸에 따로 넣으면 앱마다 문구 뒤에 줄바꿈 없이 붙여 버려서, 글 안에 직접 줄을 바꿔 넣는다.
// - 데스크톱(마우스 화면): 공유 창 없이 바로 클립보드에 복사한다 (PC 메신저에 붙여 넣어 보내는 경우가 많아서)
// 공유 창이 없거나 막힌 휴대폰 브라우저(앱 안 브라우저 등)도 복사로 대신한다.

import { isTouchScreen } from "@/shared/hooks/useIsTouch";
import { VILLAGE_SHARE_MESSAGE } from "@/shared/lib/site";

/** onStatus: 복사했을 때 띄울 알림 */
export async function shareVillage(code: string, onStatus: (text: string) => void): Promise<void> {
  const url = `${window.location.origin}/v/${code}`;
  const text = `${VILLAGE_SHARE_MESSAGE}\n${url}`;
  if (isTouchScreen() && typeof navigator.share === "function") {
    try {
      await navigator.share({ text });
      return;
    } catch (e) {
      // 공유 창을 닫은 경우엔 아무것도 하지 않는다
      if ((e as DOMException).name === "AbortError") return;
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    onStatus("링크를 복사했어요. 친구에게 보내 주세요!");
  } catch {
    window.prompt("이 링크를 복사해서 친구에게 보내 주세요", url);
  }
}

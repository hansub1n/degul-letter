"use client";

// 마을 공유.
// - 친구에게 마을 보내기: 휴대폰(터치 화면)은 기본 공유 창(카카오톡·문자·인스타 등)에 "문구 줄바꿈 주소" 글 하나로 보낸다.
//   주소를 url 칸에 따로 넣으면 앱마다 문구 뒤에 줄바꿈 없이 붙여 버려서, 글 안에 직접 줄을 바꿔 넣는다.
//   데스크톱(마우스 화면)이나 공유 창이 없는 브라우저(앱 안 브라우저 등): 화면이 "공유하기" 팝업(주소 + 복사 버튼)을 띄운다.
// - 스토리 카드(수첩 메뉴): Web Share API로 이미지 파일을 보내고, 못 보내면 이미지를 내려받는다.

import { STORY_HANDLE, STORY_HASHTAG } from "@/shared/lib/storyShare";
import { VILLAGE_SHARE_MESSAGE } from "@/shared/lib/site";
import { isTouchScreen } from "@/shared/lib/touchScreen";

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

export const STORY_CARD_FILE_NAME = "degul-letter-story.png";

export type StoryShareResult = "shared" | "cancelled" | "downloaded";

function download(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/**
 * 스토리 카드를 공유한다. 이미지 파일을 Web Share API로 보낼 수 있으면 공유 창을 띄우고,
 * 지원하지 않거나 실패하면 이미지를 내려받는다 (창을 닫은 것은 실패가 아니라 취소라서 내려받지 않는다).
 * 공유 창은 버튼을 누른 바로 그 순간에만 열 수 있어서, 호출 전에 blob을 미리 만들어 두고 await 없이 부른다.
 */
export async function shareStoryCard(blob: Blob): Promise<StoryShareResult> {
  try {
    const file = new File([blob], STORY_CARD_FILE_NAME, { type: "image/png" });
    if (typeof navigator.share === "function" && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], text: `${STORY_HASHTAG} ${STORY_HANDLE}` });
        return "shared";
      } catch (e) {
        if ((e as DOMException).name === "AbortError") return "cancelled";
      }
    }
  } catch {
    // File을 만들 수 없는 브라우저: 내려받기로 넘어간다
  }
  download(blob, STORY_CARD_FILE_NAME);
  return "downloaded";
}

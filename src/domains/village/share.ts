"use client";

// 마을 공유. 공유하기 팝업(SharePopup)이 아래 둘을 쓴다.
// - 링크 보내기: 휴대폰(터치 화면)은 기본 공유 창(카카오톡·문자 등)에 "문구 줄바꿈 주소" 글 하나로 보낸다.
//   주소를 url 칸에 따로 넣으면 앱마다 문구 뒤에 줄바꿈 없이 붙여 버려서, 글 안에 직접 줄을 바꿔 넣는다.
//   데스크톱이나 공유 창이 없는 브라우저는 팝업의 복사 버튼으로 복사한다.
// - 스토리 카드: Web Share API로 이미지 파일을 보내고, 못 보내면 이미지를 내려받는다.

import { CONTEST_HANDLE, CONTEST_HASHTAG } from "@/shared/lib/contest";
import { VILLAGE_SHARE_MESSAGE } from "@/shared/lib/site";
import { isTouchScreen } from "@/shared/lib/touchScreen";

export function villageUrl(code: string): string {
  return `${window.location.origin}/v/${code}`;
}

/** 공유 창으로 링크를 바로 보낼 수 있는지 (휴대폰 등) */
export function canShareLink(): boolean {
  return isTouchScreen() && typeof navigator.share === "function";
}

/** 링크를 공유 창으로 보낸다. 사용자가 창을 닫은 것도 "cancelled"로 구분하고, 그 밖의 실패는 "failed" */
export async function shareVillageLink(code: string): Promise<"shared" | "cancelled" | "failed"> {
  try {
    await navigator.share({ text: `${VILLAGE_SHARE_MESSAGE}\n${villageUrl(code)}` });
    return "shared";
  } catch (e) {
    return (e as DOMException).name === "AbortError" ? "cancelled" : "failed";
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
        await navigator.share({ files: [file], text: `${CONTEST_HASHTAG} ${CONTEST_HANDLE}` });
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

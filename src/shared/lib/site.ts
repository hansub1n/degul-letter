// 공유 링크·검색에 쓰는 사이트 주소와 문장. 비밀 값이 아니다.

export const SITE_URL = "https://degul-letter.vercel.app";
export const SITE_NAME = "데굴레터";
export const SITE_TITLE = "데굴레터 — 크리스마스에 열리는 눈사람 편지";
export const SITE_DESCRIPTION =
  "내 마을 링크를 보내면 친구들이 눈사람을 세우고 편지를 남겨요. 편지는 12월 25일에 열려요.";

/** 마을 공유 링크의 제목·설명. 이름 말고는 넣지 않는다. */
export function villageShareText(name: string): { title: string; description: string } {
  return {
    title: `${name}의 마을에 눈사람을 세워 주세요. 당신을 기다려요`,
    description: "로그인 없이 바로 눈덩이를 굴려 눈사람을 만들고, 크리스마스에 열릴 편지를 남겨 주세요.",
  };
}

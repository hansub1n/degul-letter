// 공유 링크·검색에 쓰는 사이트 주소와 문장. 비밀 값이 아니다.

export const SITE_URL = "https://degul-letter.vercel.app";
export const SITE_NAME = "데굴레터";
export const SITE_TITLE = "데굴레터 — 친구가 세워 주는 눈사람과 크리스마스 편지";
export const SITE_DESCRIPTION =
  "눈덩이를 굴려 친구의 마을에 눈사람을 세우고, 크리스마스에 열어 볼 편지를 남겨요.";

/** 마을 공유 링크의 제목·설명. 이름 말고는 넣지 않는다. */
export function villageShareText(name: string): { title: string; description: string } {
  return {
    title: `${name}의 마을에 눈사람을 세워 주세요`,
    description: `${name}의 마을에 눈사람을 세우고, 크리스마스에 열어 볼 편지를 남겨 주세요.`,
  };
}

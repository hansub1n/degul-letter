// 공유 링크·검색에 쓰는 사이트 주소와 문장. 비밀 값이 아니다.

export const SITE_URL = "https://degul-letter.vercel.app";
export const SITE_NAME = "데굴레터";
export const SITE_TITLE = "데굴레터 — 크리스마스에 열리는 눈사람 편지";
export const SITE_DESCRIPTION =
  "내 마을 링크를 보내면 친구들이 눈사람을 세우고 편지를 남겨요. 편지는 12월 25일에 열려요.";

/** 첫 화면 "로그인 없이 마을 구경하기"로 누구나 들어가 볼 수 있는 체험 마을 (데굴이의 마을) */
export const DEMO_VILLAGE_CODE = "4896ke";

/** 카톡 미리보기용 한 줄 설명. 제목 칸에는 SITE_NAME만 넣어 "데굴레터 / 한 줄 설명" 두 줄로 보이게 한다 */
export const SITE_SHARE_DESCRIPTION = "친구들이 내 마을에 눈사람을 세우고 크리스마스 편지를 남겨요";

/** 마을 공유 링크의 제목·설명. 이름 말고는 넣지 않는다. */
export function villageShareText(name: string): { title: string; shareTitle: string; description: string } {
  return {
    // 브라우저 탭 제목 (layout 템플릿이 뒤에 " · 데굴레터"를 붙인다)
    title: `${name}의 마을`,
    // 카톡 미리보기는 굵은 제목 한 줄 + 흐린 설명 한 줄로 보인다.
    // 제목 칸에 서비스 이름을, 설명 칸에 부탁하는 말을 넣어 "데굴레터 / ○○의 마을에…" 두 줄로 읽히게 한다
    shareTitle: SITE_NAME,
    description: `${name}의 마을에 눈사람을 세우고 크리스마스 편지를 남겨주세요`,
  };
}

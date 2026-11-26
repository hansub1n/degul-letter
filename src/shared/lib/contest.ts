// 눈사람 대회(데굴이가 뽑는 올해의 눈사람)의 이름·해시태그·안내 문구. 비밀 값이 아니다.
// 대회 이름이나 해시태그를 바꿀 때는 이 파일만 고친다. 스토리 카드 그림, 공유 창, 편지 직후 안내가 모두 여기서 읽는다.

export const CONTEST_NAME = "데굴이가 뽑는 올해의 눈사람";
export const CONTEST_HASHTAG = "#올해의눈사람";
/** 스토리에 태그해 달라고 부탁하는 인스타그램 계정 */
export const CONTEST_HANDLE = "@degul_letter";

/** 눈사람과 편지를 남긴 직후 안내 */
export const CONTEST_NOTICE_AFTER_LETTER = `스토리에 올리면 12.25 한정, ${CONTEST_NAME}에 참여돼요. ${CONTEST_HANDLE} 를 태그해 주세요!`;

/** 마을 주인의 공유하기 팝업 안내 */
export const CONTEST_NOTICE_OWNER_SHARE = `친구에게 링크를 보내고, 스토리에 올리면 ${CONTEST_HASHTAG} 에도 참여할 수 있어요. ${CONTEST_HANDLE} 태그 잊지 마세요!`;

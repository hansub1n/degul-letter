// 주로 터치로 쓰는 화면인지 (휴대폰·태블릿). 마우스로 쓰는 데스크톱은 false.
// 공유 버튼을 휴대폰은 공유 창, 데스크톱은 공유하기 팝업으로 나눌 때 쓴다.

const QUERY = "(pointer: coarse)";

export function isTouchScreen(): boolean {
  return typeof window !== "undefined" && window.matchMedia(QUERY).matches;
}

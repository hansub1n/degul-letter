// identities 테이블의 줄 ID. Appwrite 줄 ID는 36자, 영문·숫자·._- 만 된다.
// 카카오는 `kakao_회원번호`, 구글은 `google_sub`. sub가 이 규칙을 넘으면 거절한다.

const ROW_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,35}$/;

export function identityRowId(provider: "kakao" | "google", externalId: string): string | null {
  const rowId = `${provider}_${externalId}`;
  return ROW_ID.test(rowId) ? rowId : null;
}

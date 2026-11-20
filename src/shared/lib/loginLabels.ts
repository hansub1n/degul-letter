// 로그인했다고 볼 수 있는 표시. 라벨은 서버 키로만 붙일 수 있다.
// prefs(계정 설정값)는 여기 인자로 받지 않는다. 브라우저에서 스스로 고칠 수 있어서 판단에 쓰면 안 된다.

export const KAKAO_LABEL = "kakao";
export const GOOGLE_LABEL = "google";

export const LOGIN_LABELS = [KAKAO_LABEL, GOOGLE_LABEL] as const;

export function hasLoginLabel(labels: readonly string[]): boolean {
  return labels.some((label) => (LOGIN_LABELS as readonly string[]).includes(label));
}

/**
 * 진짜 로그인인지.
 * - 카카오·구글: 로그인 서버가 붙인 라벨
 * - 그 밖: Appwrite가 직접 남긴 연결 기록 수 (사용자가 만들 수 없다)
 * prefs는 보지 않는다. 익명 계정이 prefs만 바꿔도 false다.
 */
export function isLoggedInAccount(user: { labels: readonly string[]; identityCount: number }): boolean {
  return hasLoginLabel(user.labels) || user.identityCount > 0;
}

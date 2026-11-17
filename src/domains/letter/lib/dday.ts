// 크리스마스(12/25)까지 남은 날. 한국 시간 기준으로 센다.

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** 한국 날짜 기준 오늘이 몇 번째 날인지 (1970-01-01부터 센 날 수) */
function kstDayNumber(time: number): number {
  return Math.floor((time + KST_OFFSET_MS) / DAY_MS);
}

/**
 * "MM-DD"(예: "12-25")를 올해 그날 한국 시간 낮 12시로 바꾼다. 형식이 틀리면 null.
 * 개발 중에 "그날이라면 어떻게 보일까"를 미리 보는 데만 쓴다.
 */
export function parseTodayOverride(value: string | null | undefined, now: number = Date.now()): number | null {
  const match = value?.match(/^(\d{1,2})-(\d{1,2})$/);
  if (!match) return null;
  const year = new Date(now + KST_OFFSET_MS).getUTCFullYear();
  return Date.UTC(year, Number(match[1]) - 1, Number(match[2]), 12) - KST_OFFSET_MS;
}

/**
 * 지금 시각. 개발 모드에서 주소 뒤에 ?today=12-25 를 붙이면 그날인 것처럼 계산한다.
 * 배포 버전(production)에서는 무시한다.
 */
export function currentTime(): number {
  if (process.env.NODE_ENV === "development" && typeof window !== "undefined") {
    const override = parseTodayOverride(new URLSearchParams(window.location.search).get("today"));
    if (override !== null) return override;
  }
  return Date.now();
}

/**
 * 올해 크리스마스까지 남은 날 수. 0이면 오늘이 크리스마스, 음수면 지났다.
 * 편지를 열 수 있는지는 0 이하로 판단한다.
 */
export function daysUntilChristmas(now: number = currentTime()): number {
  const kstNow = new Date(now + KST_OFFSET_MS);
  const year = kstNow.getUTCFullYear();
  const christmas = Date.UTC(year, 11, 25) - KST_OFFSET_MS; // 한국 시간 12/25 00:00
  return kstDayNumber(christmas) - kstDayNumber(now);
}

/** 편지를 열 수 있는 날인지 (한국 시간 12/25 00:00부터) */
export function isLetterOpen(now: number = currentTime()): boolean {
  return daysUntilChristmas(now) <= 0;
}

/** "D-38", "D-DAY", "크리스마스 지남" 같은 표시 문구 */
export function christmasLabel(now: number = currentTime()): string {
  const d = daysUntilChristmas(now);
  if (d > 0) return `D-${d}`;
  if (d === 0) return "D-DAY";
  return "크리스마스 지남";
}

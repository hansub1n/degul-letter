// letter 도메인의 공개 API. 다른 도메인은 이 파일로만 import한다.
export { createLetter, deleteLetter, openLetter } from "./api";
export { LetterBox, type LetterSummary } from "./components/LetterBox";
export { LetterCard } from "./components/LetterCard";
export { AirmailFrame } from "./components/AirmailFrame";
export { LetterStamp } from "./components/LetterStamp";
export { christmasLabel, daysUntilChristmas, isLetterOpen } from "./lib/dday";
export { useChristmasLabel } from "./hooks/useChristmasLabel";
export { LETTER_MAX_LENGTH } from "./types";

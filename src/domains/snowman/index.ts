// snowman 도메인의 공개 API. 다른 도메인은 이 파일로만 import한다.
export { SculptEditor } from "./components/SculptEditor";
export { drawSculpt, sculptContentTop, sculptFromBalls } from "./lib/sculpt";
export { decodeSculpt, encodeSculpt } from "./lib/serialize";
export type { Sculpt, SculptTool } from "./types";

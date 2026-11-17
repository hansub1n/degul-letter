/**
 * 정수 좌표용 의사 난수 (0~1). 이웃한 칸끼리 값이 닮지 않아서 무늬가 고르게 흩어진다.
 * hash2는 sin 기반이라 정수 칸 단위로 쓰면 대각선 줄무늬가 생긴다.
 */
export function hashInt(x: number, y: number): number {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** 좌표마다 늘 같은 0~1 값을 주는 의사 난수. 눈밭 무늬처럼 고정된 무늬에 쓴다. */
export function hash2(x: number, y: number): number {
  const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return h - Math.floor(h);
}

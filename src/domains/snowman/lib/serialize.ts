// 조각 데이터를 저장용 문자열로 바꾸고, 다시 되돌린다.
// 칸 값(0~3)을 한 글자씩 이어 붙인 뒤 base64로 줄여서 JSON에 담는다.

import type { Sculpt } from "./sculpt";

type Stored = { w: number; h: number; o: number; c: string };

export function encodeSculpt(s: Sculpt): string {
  let binary = "";
  for (const v of s.cells) binary += String.fromCharCode(v);
  const stored: Stored = { w: s.width, h: s.height, o: s.originX, c: btoa(binary) };
  return JSON.stringify(stored);
}

/** 망가진 데이터면 null (그 눈사람은 그냥 눈덩이 모양으로 보인다) */
export function decodeSculpt(text: string): Sculpt | null {
  try {
    const { w, h, o, c } = JSON.parse(text) as Stored;
    const binary = atob(c);
    if (!Number.isInteger(w) || !Number.isInteger(h) || binary.length !== w * h) return null;
    const cells = new Uint8Array(w * h);
    for (let i = 0; i < binary.length; i++) cells[i] = binary.charCodeAt(i) & 3;
    return { width: w, height: h, originX: o, cells };
  } catch {
    return null;
  }
}

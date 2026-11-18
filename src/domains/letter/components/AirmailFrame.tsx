import type { ReactNode } from "react";

const PERIOD = 30;

/** 45도 항공우편 줄무늬: --roof 9칸, --paper 6칸, --ink 9칸, --paper 6칸 */
function fillAt(t: number): string {
  const n = ((t % PERIOD) + PERIOD) % PERIOD;
  if (n < 9) return "var(--roof)";
  if (n < 15) return "var(--paper)";
  if (n < 24) return "var(--ink)";
  return "var(--paper)";
}

const TILE: ReactNode[] = [];
for (let y = 0; y < PERIOD; y++) {
  let x = 0;
  while (x < PERIOD) {
    const fill = fillAt(x + y);
    let end = x + 1;
    while (end < PERIOD && fillAt(end + y) === fill) end++;
    TILE.push(<rect key={`${y}-${x}`} x={x} y={y} width={end - x} height={1} fill={fill} />);
    x = end;
  }
}

/**
 * 크림 편지지 둘레에 3칸(9px) 항공우편 줄무늬와, 그 바깥 1칸(3px) 남색 테두리를 두른다.
 * 줄무늬는 CSS 그라데이션 대신 30칸 도트 타일을 써서, 배율이 달라도 빗금이 번지지 않게 한다.
 */
export function AirmailFrame({ children }: { children: ReactNode }) {
  return (
    <div className="airmail-frame">
      <svg className="airmail-frame-pattern" aria-hidden>
        <defs>
          <pattern id="degul-airmail" width={PERIOD} height={PERIOD} patternUnits="userSpaceOnUse">
            {TILE}
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#degul-airmail)" />
      </svg>
      {children}
    </div>
  );
}

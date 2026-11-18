import { PixelIcon } from "@/shared/components/PixelIcon";

type Props = {
  hasVillage: boolean;
  onClick: () => void;
  className?: string;
};

/**
 * 친구 마을에 온 손님용 표지판 버튼.
 * 왼쪽 이름 판과 같은 나무 패, 같은 안쪽 여백, 같은 12px 갈무리 글자를 써서
 * 큰 빨간 CTA가 아니라 짝이 되는 작은 안내판처럼 보이게 한다.
 */
export function MyVillageSign({ hasVillage, onClick, className = "" }: Props) {
  return (
    <button
      type="button"
      data-tone="wood"
      data-my-village-sign=""
      className={`pixel-box pixel-btn pointer-events-auto relative ml-auto inline-flex shrink-0 select-none items-center gap-[var(--p)] whitespace-nowrap ${className}`}
      style={{ padding: "calc(var(--p) * 2) calc(var(--p) * 3)" }}
      onClick={onClick}
    >
      <PixelIcon name="house" scale={2} fit className="relative shrink-0" />
      <span className="text-label text-outline-ink">{hasVillage ? "내 마을 가기" : "내 마을 만들기"}</span>
    </button>
  );
}

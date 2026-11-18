import { christmasLabel } from "@/domains/letter";
import { PixelBadge } from "@/shared/components/PixelBadge";
import { PixelPanel } from "@/shared/components/PixelPanel";
import { PixelToast } from "@/shared/components/PixelToast";

/**
 * 마을에 들어오면 위쪽에 나무 표지판이 떴다가 사라진다 (게임에서 새 지역에 들어갈 때처럼).
 * 표지판에는 마을 이름과 크리스마스 꼬리표만, 안내 문구는 표지판 아래 토스트로 따로 띄운다.
 */
export function VillageTitle({ name, subtitle }: { name: string; subtitle: string }) {
  return (
    <div className="title-in-out pointer-events-none absolute inset-x-4 top-[15%] flex flex-col items-center gap-[calc(var(--p)*5)] text-center">
      <div className="flex flex-col items-center">
        <PixelPanel tone="wood" style={{ padding: "calc(var(--p) * 2) calc(var(--p) * 6)" }}>
          <p className="text-display text-outline-ink">{name}</p>
        </PixelPanel>
        {/* D-day 꼬리표는 표지판 아래쪽 가장자리에 걸친다 */}
        <PixelBadge icon="holly" data-twinkle className="relative z-10 -mt-[var(--p)]">
          크리스마스 {christmasLabel()}
        </PixelBadge>
      </div>
      <PixelToast placement="inline">{subtitle}</PixelToast>
    </div>
  );
}

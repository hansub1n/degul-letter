import { christmasLabel } from "@/domains/letter";
import { PixelBadge } from "@/shared/components/PixelBadge";
import { PixelPanel } from "@/shared/components/PixelPanel";

/**
 * 인트로 표지판이 사라진 뒤에도 왼쪽 위에 남는 작은 마을 이름 판.
 * 큰 표지판과 같이 나무 판 + 호랑가시 D-day 꼬리표이고, 공유 단추·아래 안내와 겹치지 않게 작게 둔다.
 */
export function VillageNameplate({ name }: { name: string }) {
  return (
    <div className="nameplate-in pointer-events-none flex max-w-[calc(100%-48px)] flex-col items-start">
      <PixelPanel tone="wood" pad={0} style={{ padding: "calc(var(--p) * 2) calc(var(--p) * 3)" }}>
        <p className="text-label text-outline-ink truncate">{name}</p>
      </PixelPanel>
      <PixelBadge icon="holly" data-twinkle className="relative z-10 -mt-[var(--p)]">
        크리스마스 {christmasLabel()}
      </PixelBadge>
    </div>
  );
}

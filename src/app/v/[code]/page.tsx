import { Suspense } from "react";
import { VillageScreen } from "@/domains/village";

// 공유 링크로 들어오는 마을. 마을 코드는 VillageScreen이 주소에서 직접 읽는다.
// 코드는 접속할 때에야 알 수 있어서(cacheComponents) Suspense로 감싸고, 그동안 안내 문구를 보여 준다.
export default function VillagePage() {
  return (
    <main className="fixed inset-0 bg-[#1A1730]">
      <Suspense
        fallback={
          <div className="fixed inset-0 flex items-center justify-center bg-[#F2F6FB]">
            <p className="pixel-box pixel-box-flat px-3 py-2 text-[12px] text-ink">마을로 가는 중…</p>
          </div>
        }
      >
        <VillageScreen />
      </Suspense>
    </main>
  );
}

import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { VillageScreen } from "@/domains/village";
import { getPublicVillageName } from "@/domains/village/server";
import { FootstepsLoader } from "@/shared/components/FootstepsLoader";
import { SITE_NAME, villageShareText } from "@/shared/lib/site";

// 카카오톡·슬랙에 붙는 제목. 마을 이름만 쓰고, 편지 내용·만든 사람 목록은 넣지 않는다.
// 주소의 마을 코드(params)를 읽어야 해서 접속할 때 만든다. 아래 DynamicMarker가 그걸 Next.js에 알려 준다.
export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params;
  const name = await getPublicVillageName(code);
  if (!name) {
    return { title: "마을을 찾을 수 없어요", robots: { index: false, follow: false } };
  }
  const { title, shareTitle, description } = villageShareText(name);
  // openGraph·twitter를 여기서 새로 주면 layout의 값(공유 이미지 포함)을 통째로 덮어쓴다.
  // 그래서 카톡 미리보기에 그림이 빠지지 않게 사이트 공유 이미지(app/opengraph-image.png)를 다시 적는다.
  const image = { url: "/opengraph-image.png", width: 1200, height: 630, alt: "데굴레터 마을과 눈 조각들" };
  return {
    title,
    description,
    openGraph: { type: "website", locale: "ko_KR", siteName: SITE_NAME, title: shareTitle, description, url: `/v/${code}`, images: [image] },
    twitter: { card: "summary_large_image", title: shareTitle, description, images: ["/twitter-image.png"] },
  };
}

// 아무것도 그리지 않는 표시: "이 페이지는 접속할 때 그린다"를 Next.js에 알려,
// 메타데이터가 주소(params)를 읽어도 "메타데이터가 막혔다" 오류가 나지 않게 한다 (Next.js 문서의 권장 방법).
// Suspense 안에 두어 나머지 화면은 그대로 미리 그려진다.
async function Connection() {
  await connection();
  return null;
}

function DynamicMarker() {
  return (
    <Suspense>
      <Connection />
    </Suspense>
  );
}

// 공유 링크로 들어오는 마을. 마을 코드는 VillageScreen이 주소에서 직접 읽는다.
// 코드는 접속할 때에야 알 수 있어서(cacheComponents) Suspense로 감싸고, 그동안 안내 문구를 보여 준다.
export default function VillagePage() {
  return (
    <main className="fixed inset-0 bg-ground">
      <Suspense fallback={<FootstepsLoader />}>
        <VillageScreen />
      </Suspense>
      <DynamicMarker />
    </main>
  );
}

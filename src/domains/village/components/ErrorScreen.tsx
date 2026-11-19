"use client";

import { useRouter } from "next/navigation";
import { PixelButton } from "@/shared/components/PixelButton";
import { PixelDialog } from "@/shared/components/PixelDialog";
import { SantaLostArt } from "@/shared/components/SantaSleighLoader";
import { HomeBackdrop } from "./HomeBackdrop";

type Props = {
  /** 한 줄 제목 (예: "마을을 찾을 수 없어요") */
  title: string;
  /** 제목 아래 한 줄 안내 (예: "링크를 다시 확인해 주세요") */
  description: string;
  /** 있으면 "다시 시도" 단추를 보여 준다 */
  onRetry?: () => void;
};

/**
 * 길을 잃었거나 화면을 그리지 못했을 때 쓰는 안내. 없는 주소, 없는 마을, 오류 화면이 모두 이 모양 하나를 쓴다.
 * 첫 화면과 같은 눈밭 위에, 확인 창들과 같은 눈 재질 창 + 길을 잃은 산타 썰매(물음표) + 제목·안내 두 줄.
 * 첫 화면 로딩에서 산타가 마을을 찾아 날아가므로, "산타가 마을을 못 찾았다"로 이어진다.
 * 문장을 제목과 안내로 나눠서 줄바꿈이 문장 가운데에서 어색하게 일어나지 않게 한다.
 */
export function ErrorScreen({ title, description, onRetry }: Props) {
  const router = useRouter();
  const goHome = () => router.push("/");
  return (
    <main className="fixed inset-0 bg-ground">
      <HomeBackdrop />
      {/* 다른 확인 창과 같은 공용 창(크기·여백·베일)을 쓴다. 닫을 곳이 없으니 Esc는 첫 화면으로 */}
      <PixelDialog title={title} hideHeader closeOnVeil={false} onClose={goHome}>
        <div className="flex flex-col items-center gap-[calc(var(--p)*4)] px-[calc(var(--p)*2)] pb-[calc(var(--p)*1)] pt-[calc(var(--p)*3)] text-center break-keep">
          <SantaLostArt scale={3} />
          <h1 className="text-title">{title}</h1>
          <p className="text-body text-muted">{description}</p>
          <PixelButton variant="primary" className="w-full" onClick={goHome}>
            첫 화면으로
          </PixelButton>
          {onRetry && (
            <PixelButton variant="ghost" size="sm" onClick={onRetry}>
              다시 시도
            </PixelButton>
          )}
        </div>
      </PixelDialog>
    </main>
  );
}

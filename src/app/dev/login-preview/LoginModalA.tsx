"use client";

import { PixelButton } from "@/shared/components/PixelButton";
import { PixelDialog } from "@/shared/components/PixelDialog";
import { LoginKeyArt } from "./LoginKeyArt";
import { LoginMethods } from "./LoginMethods";

type Props = {
  onClose: () => void;
};

/**
 * 시안 A: FinishDialog / LeaveConfirm과 같은 베일·눈 재질 창.
 * 가운데에 작은 열쇠 그림을 두고, 제목·안내·단추 간격도 확인 화면과 맞춘다.
 */
export function LoginModalA({ onClose }: Props) {
  return (
    <PixelDialog title="내 마을을 지켜 줄 열쇠" hideHeader closeOnVeil onClose={onClose}>
      <div className="flex flex-col items-center gap-[calc(var(--p)*4)] px-[calc(var(--p)*2)] pb-[calc(var(--p)*1)] pt-[calc(var(--p)*3)] text-center">
        <LoginKeyArt scale={5} />
        <h2 className="text-title">
          내 마을을
          <br />
          지켜 줄 열쇠
        </h2>
        <p className="text-body text-muted">
          로그인하면 받은 편지를 지켜 주고,
          <br />
          어떤 기기에서든 열어 볼 수 있어요
        </p>
        <LoginMethods />
        <PixelButton variant="ghost" size="sm" onClick={onClose}>
          나중에 할게요
        </PixelButton>
      </div>
    </PixelDialog>
  );
}

"use client";

import { PixelButton } from "@/shared/components/PixelButton";
import { PixelDialog } from "@/shared/components/PixelDialog";
import { PixelIcon } from "@/shared/components/PixelIcon";

type Props = {
  /** 이미 자기 마을이 있으면 "내 마을 가기", 없으면(로그인은 했지만 아직 안 만든 경우) "내 마을 만들기" */
  hasVillage: boolean;
  onGo: () => void;
  onClose: () => void;
};

/**
 * 방문자가 편지(또는 눈사람)를 저장한 직후 띄우는 창. 안내(DegulGuide)를 이미 봤거나 꺼도 뜬다.
 * 로그인하지 않은 방문자는 이 창 대신 초대장 로그인(InviteLogin)이 뜬다.
 * 닫아도 오른쪽 위 초대장 티켓은 그대로 남는다.
 */
export function VisitorCtaDialog({ hasVillage, onGo, onClose }: Props) {
  return (
    <PixelDialog title={hasVillage ? "편지 배달 완료!" : "나도 마을 만들기"} onClose={onClose}>
      <div className="flex min-h-full w-full flex-1 flex-col justify-center self-stretch">
        <div className="flex flex-col items-center gap-[calc(var(--p)*4)] px-[calc(var(--p)*2)] pb-[calc(var(--p)*1)] pt-[calc(var(--p)*3)] text-center">
          <PixelIcon name="houseDoor" scale={5} />
          <p className="text-body text-muted">
            {hasVillage ? (
              <>
                주인이 크리스마스에 열어 볼 거예요.
                <br />
                내 마을도 보러 갈까요?
              </>
            ) : (
              <>
                편지를 남겼어요!
                <br />
                나만의 마을을 만들어 친구들을 초대해 봐요
              </>
            )}
          </p>
          <PixelButton variant="primary" className="w-full" onClick={onGo}>
            {hasVillage ? "내 마을 가기" : "내 마을 만들기"}
          </PixelButton>
        </div>
      </div>
    </PixelDialog>
  );
}

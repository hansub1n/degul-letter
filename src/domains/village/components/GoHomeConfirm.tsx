"use client";

import { PixelButton } from "@/shared/components/PixelButton";
import { PixelDialog } from "@/shared/components/PixelDialog";
import { PixelIcon } from "@/shared/components/PixelIcon";

type Props = {
  /** 놀러 온 친구에게 이미 자기 마을이 있는지. 있으면 내 마을로, 없으면 마을 만들기로 안내한다 */
  hasVillage: boolean;
  onGo: () => void;
  onClose: () => void;
};

/**
 * 놀러 온 친구가 집 문 말풍선을 눌렀을 때 묻는 창. 로그아웃 확인 창과 같은 모양이다.
 * 이 브라우저에서 로그인하지 않았으면 다른 기기의 마을을 모르므로, 마을이 없을 때도 "찾기"까지 함께 안내한다.
 * 취소는 제목 줄의 ✕(또는 Esc·바깥 누르기)가 맡는다.
 */
export function GoHomeConfirm({ hasVillage, onGo, onClose }: Props) {
  return (
    <PixelDialog
      title="내 마을로 갈까요?"
      onClose={onClose}
    >
      <div className="flex min-h-full w-full flex-1 flex-col justify-center self-stretch">
        <div className="flex flex-col items-center gap-[calc(var(--p)*4)] px-[calc(var(--p)*2)] pb-[calc(var(--p)*1)] pt-[calc(var(--p)*3)] text-center">
          <PixelIcon name="houseDoor" scale={5} />
          <p className="text-body text-muted">
            {hasVillage ? (
              <>
                친구들이 남긴 눈사람과
                <br />
                편지를 보러 가요
              </>
            ) : (
              <>
                아직 마을이 없다면 새로 만들고,
                <br />
                이미 만든 마을이 있다면 로그인해서 찾아보세요.
              </>
            )}
          </p>
          <PixelButton variant="primary" className="w-full" onClick={onGo}>
            {hasVillage ? "내 마을 가기" : "홈으로 돌아가기"}
          </PixelButton>
        </div>
      </div>
    </PixelDialog>
  );
}

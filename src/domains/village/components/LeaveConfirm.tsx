import { PixelButton } from "@/shared/components/PixelButton";
import { MeltingSnowmanArt } from "./MeltingSnowmanArt";

type Props = {
  /** 편지 쓰기로 돌아간다 (쓰던 닉네임과 편지는 그대로 남아 있어야 한다) */
  onKeepWriting: () => void;
  /** 저장하지 않고 나간다: 눈사람은 사라진다 */
  onLeave: () => void;
};

/**
 * 편지 없이 나가려 할 때 FinishDialog 창 "안의 내용"을 이걸로 바꿔 끼운다.
 * 창을 하나 더 띄우지 않는다 (창 위에 창이 겹치면 어느 쪽을 눌러야 할지 헷갈린다).
 * 주요 동작은 "계속 쓰기" 하나뿐이고, 나가기는 흐린 글자 버튼으로 일부러 약하게 둔다.
 */
export function LeaveConfirm({ onKeepWriting, onLeave }: Props) {
  return (
    <div className="flex flex-col items-center gap-[calc(var(--p)*4)] px-[calc(var(--p)*2)] pb-[calc(var(--p)*1)] pt-[calc(var(--p)*3)] text-center">
      <MeltingSnowmanArt scale={5} />
      <h2 className="text-title">
        눈사람이
        <br />
        녹아 버려요
      </h2>
      <p className="text-body text-muted">편지를 남겨야 마을에 눈사람이 남아요</p>
      <PixelButton variant="primary" className="w-full" onClick={onKeepWriting} autoFocus>
        계속 쓰기
      </PixelButton>
      <PixelButton variant="ghost" size="sm" onClick={onLeave}>
        그냥 나가기
      </PixelButton>
    </div>
  );
}

import { PixelIcon } from "./PixelIcon";

type Props = {
  className?: string;
};

/**
 * 편지지 오른쪽 위 우표. 쓰기 칸과 읽기 칸이 같은 그림을 쓴다.
 * 옛 금색 별 우표와 같은 26×26px(13×13, scale 2) 정사각 눈사람 우표.
 * 왼쪽 아래에 42px 회색 "12.25" 소인이 겹쳐 올라온다.
 */
export function LetterStamp({ className = "" }: Props) {
  return (
    <span className={`letter-stamp pointer-events-none inline-block ${className}`} aria-hidden>
      <PixelIcon name="stamp" scale={2} fit />
      <span className="letter-postmark">
        <PixelIcon name="postmark" scale={2} fit />
        <span className="letter-postmark-date">12.25</span>
      </span>
    </span>
  );
}

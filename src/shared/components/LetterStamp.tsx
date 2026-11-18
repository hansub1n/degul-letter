import { PixelIcon } from "./PixelIcon";

type Props = {
  className?: string;
};

/**
 * 편지지 오른쪽 위 우표. 쓰기 칸과 읽기 칸이 같은 그림을 쓴다.
 * 27×30px(3px 격자 9×10) 눈사람 우표 왼쪽 아래에, 36px 회색 "12.25" 소인이 겹쳐 올라온다.
 */
export function LetterStamp({ className = "" }: Props) {
  return (
    <span className={`letter-stamp pointer-events-none inline-block ${className}`} aria-hidden>
      <PixelIcon name="stamp" scale={3} fit />
      <span className="letter-postmark">
        <PixelIcon name="postmark" scale={3} fit />
        <span className="letter-postmark-date">12.25</span>
      </span>
    </span>
  );
}

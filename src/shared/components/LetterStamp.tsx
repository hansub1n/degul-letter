import { PixelIcon } from "./PixelIcon";

type Props = {
  className?: string;
};

/**
 * 편지지 오른쪽 위 우표. 쓰기 칸과 읽기 칸이 같은 그림을 쓴다.
 * 하늘색 눈사람 우표 위에, 돌려 찍힌 회색 "12.25" 소인이 겹친다.
 */
export function LetterStamp({ className = "" }: Props) {
  return (
    <span className={`letter-stamp pointer-events-none inline-block ${className}`} aria-hidden>
      <PixelIcon name="stamp" scale={2} />
      <span className="letter-postmark">
        <PixelIcon name="postmark" scale={2} />
        <span className="letter-postmark-date">12.25</span>
      </span>
    </span>
  );
}

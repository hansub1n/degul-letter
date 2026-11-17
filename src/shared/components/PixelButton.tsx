import type { ButtonHTMLAttributes } from "react";
import { PixelIcon, type PixelIconName } from "./PixelIcon";

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  icon: PixelIconName;
  /** 무슨 버튼인지 (화면 읽기 도구와 마우스를 올렸을 때 보이는 설명) */
  label: string;
  /** 선택된 도구: 버튼이 쑥 눌려 들어간 상태로 보인다 */
  active?: boolean;
  /** 작은 버튼 (편지 카드의 닫기처럼 내용보다 눈에 덜 띄어야 할 때) */
  small?: boolean;
  children?: React.ReactNode;
};

/**
 * 게임 전체에서 함께 쓰는 도트 버튼: 흰 정사각형에 도트 아이콘 하나.
 * 누르면 한 칸 내려가며 그림자가 사라진다.
 */
export function PixelButton({
  icon,
  label,
  active = false,
  small = false,
  className = "",
  type = "button",
  children,
  ...rest
}: Props) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      aria-pressed={active || undefined}
      className={`pixel-box pixel-press relative inline-flex shrink-0 items-center justify-center overflow-hidden disabled:opacity-40 ${
        small ? "h-8 w-8" : "h-12 w-12"
      } ${active ? "pixel-box-on" : ""} ${className}`}
      {...rest}
    >
      {children}
      <PixelIcon name={icon} scale={small ? 2 : 3} className="relative" />
    </button>
  );
}

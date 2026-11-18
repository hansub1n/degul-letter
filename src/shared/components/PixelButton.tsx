import { forwardRef, type ButtonHTMLAttributes, ReactNode } from "react";
import { PixelIcon, type PixelIconName } from "./PixelIcon";

type Base = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  /** primary = roof 빨강(화면마다 하나), secondary = snow 재질, ghost = 흐린 밑줄 글자, pine = 소나무 초록(확인) */
  variant?: "primary" | "secondary" | "ghost" | "pine";
  /** md = h-11, sm = h-9 */
  size?: "md" | "sm";
  /** 선택된 도구: 버튼이 쑥 눌려 들어간 상태로 보인다 (aria-pressed) */
  active?: boolean;
};

type IconOnly = Base & {
  iconOnly: true;
  icon: PixelIconName;
  /** 아이콘만 있는 버튼은 화면 읽기 도구용 이름이 꼭 있어야 한다 */
  "aria-label": string;
  /** 아이콘 뒤에 깔 장식 (부수기 게이지 등). 글자는 넣지 않는다 */
  children?: ReactNode;
};

type WithText = Base & {
  iconOnly?: false;
  icon?: PixelIconName;
  children: ReactNode;
};

type Props = IconOnly | WithText;

/**
 * 게임 전체에서 함께 쓰는 도트 버튼.
 * hover 한 칸 위(그림자 2칸), 누르면 한 칸 아래(그림자 없음), 키보드 초점은 금색 링이다.
 * 모양은 globals.css의 `.pixel-btn`이 맡는다.
 */
export const PixelButton = forwardRef<HTMLButtonElement, Props>(function PixelButton(props, ref) {
  const {
    variant = "secondary",
    size = "md",
    active = false,
    iconOnly = false,
    icon,
    className = "",
    type = "button",
    children,
    ...rest
  } = props;
  const box = variant === "ghost" ? "" : "pixel-box";
  const height = size === "sm" ? "h-9" : "h-11";
  const shape = iconOnly ? (size === "sm" ? "w-9" : "w-11") : size === "sm" ? "gap-[calc(var(--p)*2)] px-[calc(var(--p)*4)]" : "gap-[calc(var(--p)*2)] px-[calc(var(--p)*5)]";
  const iconScale = iconOnly ? (size === "sm" ? 2 : 3) : 2;
  const title = iconOnly ? (rest as { "aria-label"?: string })["aria-label"] : undefined;

  return (
    <button
      ref={ref}
      type={type}
      title={title}
      aria-pressed={active || undefined}
      data-variant={variant}
      className={`${box} pixel-btn text-label relative inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap ${height} ${shape} ${
        active ? "pixel-box-on" : ""
      } ${className}`}
      {...rest}
    >
      {iconOnly && children}
      {icon && <PixelIcon name={icon} scale={iconScale} className="relative shrink-0" />}
      {!iconOnly && children}
    </button>
  );
});

import type { ButtonHTMLAttributes } from "react";

/** 글자가 꼭 필요한 곳(마을 만들기, 링크 복사 등)에 쓰는 도트 버튼. 아이콘 버튼과 같은 도트 상자 모양이다. */
export function PixelTextButton({ className = "", type = "button", ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      className={`pixel-box pixel-press inline-flex h-11 items-center justify-center whitespace-nowrap px-4 text-[12px] font-bold text-ink disabled:opacity-40 ${className}`}
      {...rest}
    />
  );
}

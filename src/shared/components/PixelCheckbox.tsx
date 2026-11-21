import type { InputHTMLAttributes, ReactNode } from "react";
import { PixelIcon } from "./PixelIcon";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  /** 체크칸 오른쪽 글 (링크를 넣어도 된다) */
  children: ReactNode;
};

/**
 * 도트 체크칸. 진짜 체크박스(input)는 화면에서 숨기고 키보드·화면 읽기는 그대로 쓰며,
 * 입력칸과 같은 flat 상자 안에 체크 아이콘을 그린다. 초점이 오면 입력칸처럼 금색 링이 생긴다.
 */
export function PixelCheckbox({ children, className = "", checked, ...rest }: Props) {
  return (
    <label className={`text-caption flex cursor-pointer items-start gap-[calc(var(--p)*3)] ${className}`}>
      <input type="checkbox" className="peer sr-only" checked={checked} {...rest} />
      <span
        aria-hidden
        className="pixel-box pixel-box-flat pixel-field flex size-[calc(var(--p)*7)] shrink-0 items-center justify-center peer-focus-visible:outline-2 peer-focus-visible:outline-gold"
      >
        {checked && <PixelIcon name="check" scale={1} />}
      </span>
      <span className="pt-[calc(var(--p)*1)] leading-[1.6]">{children}</span>
    </label>
  );
}

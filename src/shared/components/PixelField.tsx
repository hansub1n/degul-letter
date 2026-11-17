import { useId, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";
import { PixelIcon } from "./PixelIcon";

type Common = {
  /** 입력칸 위의 이름표. placeholder만으로 두지 않는다 */
  label: ReactNode;
  /** 이름표 오른쪽에 붙는 보조 글 (글자 수 n/1000 등) */
  hint?: ReactNode;
  className?: string;
};

type InputProps = Common & { multiline?: false; tone?: "snow" } & InputHTMLAttributes<HTMLInputElement>;
type TextareaProps = Common & {
  multiline: true;
  /** paper = 편지지 (24px 줄, 우표 장식) */
  tone?: "snow" | "paper";
} & TextareaHTMLAttributes<HTMLTextAreaElement>;

type Props = InputProps | TextareaProps;

/** `<label>` + 도트 입력칸. 입력칸은 그림자 없는 flat 상자이고, 초점이 오면 금색 링이 생긴다. */
export function PixelField(props: Props) {
  const autoId = useId();
  const { label, hint, className = "", id = autoId } = props;

  let control: ReactNode;
  if (props.multiline) {
    const { label: _l, hint: _h, className: _c, multiline: _m, tone = "snow", ...rest } = props;
    void _l;
    void _h;
    void _c;
    void _m;
    const paper = tone === "paper";
    control = (
      <div className="relative">
        <textarea
          id={id}
          data-tone={paper ? "paper" : "snow"}
          className={`pixel-box pixel-box-flat pixel-field text-body w-full resize-none px-[calc(var(--p)*4)] ${
            paper ? "pixel-paper-lines pr-[calc(var(--p)*14)]" : "py-[calc(var(--p)*3)]"
          }`}
          style={paper ? { lineHeight: "24px", paddingTop: 0, paddingBottom: 0 } : undefined}
          {...rest}
        />
        {paper && <PixelIcon name="stamp" scale={2} className="pointer-events-none absolute right-[calc(var(--p)*3)] top-[calc(var(--p)*3)]" />}
      </div>
    );
  } else {
    const { label: _l, hint: _h, className: _c, multiline: _m, tone: _t, ...rest } = props;
    void _l;
    void _h;
    void _c;
    void _m;
    void _t;
    control = (
      <input id={id} className="pixel-box pixel-box-flat pixel-field text-body h-11 w-full px-[calc(var(--p)*4)]" {...rest} />
    );
  }

  return (
    <div className={`flex flex-col gap-[calc(var(--p)*2)] ${className}`}>
      <div className="flex items-baseline justify-between gap-[calc(var(--p)*2)]">
        <label htmlFor={id} className="text-label">
          {label}
        </label>
        {hint && <span className="text-caption">{hint}</span>}
      </div>
      {control}
    </div>
  );
}

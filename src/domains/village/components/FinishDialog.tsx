"use client";

import { useState } from "react";
import { LETTER_MAX_LENGTH } from "@/domains/letter";
import { PixelTextButton } from "@/shared/components/PixelTextButton";

type Submit = (result: { name: string; letter: string }) => void;

type Props =
  /** 친구: 닉네임을 정하고, 마을 주인에게 편지를 남긴다 */
  | { mode: "visitor"; recipient: string; onSubmit: Submit }
  /** 마을 주인: 닉네임을 정하고, 크리스마스의 나에게 편지를 남긴다 */
  | { mode: "owner"; onSubmit: Submit };

/** 눈사람을 완성하면 뜨는 창 */
export function FinishDialog(props: Props) {
  // 한 폰을 여러 사람이 돌려 쓸 수 있으니 닉네임은 매번 빈칸에서 새로 쓴다
  const [nickname, setNickname] = useState("");
  const [letter, setLetter] = useState("");
  const owner = props.mode === "owner";
  const name = nickname.trim();

  // 눈사람 하나 = 편지 한 통. 친구도 주인도 편지를 꼭 쓴다.
  const submit = () => {
    if (!name || !letter.trim()) return;
    props.onSubmit({ name, letter: letter.trim() });
  };

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#1A173066] px-5">
      <form
        className="pixel-box pixel-box-flat flex w-full max-w-[340px] flex-col gap-3 p-4 text-ink"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <label className="flex flex-col gap-2">
          <span className="text-[12px] font-bold">닉네임</span>
          <input
            autoFocus
            value={nickname}
            maxLength={10}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="눈사람과 편지에 쓰여요"
            className="pixel-box pixel-box-flat h-11 bg-white px-3 text-[12px] outline-none"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-[12px] font-bold">
            {owner ? "크리스마스의 나에게 남길 편지" : `${props.recipient}에게 남길 편지`}
          </span>
          <textarea
            value={letter}
            maxLength={LETTER_MAX_LENGTH}
            onChange={(e) => setLetter(e.target.value)}
            placeholder={
              owner
                ? "한 줄이어도 좋아요. 친구들 편지와 함께 12월 25일에 열려요."
                : "한 줄이어도 좋아요. 12월 25일에 열려요."
            }
            rows={6}
            className="pixel-box pixel-box-flat resize-none bg-white px-3 py-2 text-[12px] leading-[1.6] outline-none"
          />
          <span className="self-end text-[12px] text-[#8E86B8]">
            {letter.length}/{LETTER_MAX_LENGTH}
          </span>
        </label>

        <div className="flex flex-col gap-2">
          <PixelTextButton type="submit" disabled={!name || !letter.trim()}>
            편지 넣고 눈사람 세우기
          </PixelTextButton>

        </div>
      </form>
    </div>
  );
}

/**
 * 마을에 들어오면 위쪽에 마을 이름이 크게 떴다가 사라진다 (게임에서 새 지역에 들어갈 때처럼).
 * 화면에 계속 떠 있는 글자를 없애려고, 이름과 편지 소식은 여기서 한 번만 보여 준다.
 */
export function VillageTitle({ name, subtitle }: { name: string; subtitle: string }) {
  return (
    <div className="title-in-out pointer-events-none absolute inset-x-4 top-[18%] flex flex-col items-center gap-3 text-center">
      <p
        className="text-[36px] font-bold leading-none text-white"
        style={{ textShadow: "3px 0 #2A2350, -3px 0 #2A2350, 0 3px #2A2350, 0 -3px #2A2350, 3px 3px #2A2350, -3px 3px #2A2350, 3px -3px #2A2350, -3px -3px #2A2350" }}
      >
        {name}
      </p>
      <p className="pixel-box pixel-box-flat px-3 py-2 text-[12px] text-ink">{subtitle}</p>
    </div>
  );
}

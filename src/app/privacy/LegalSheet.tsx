import Link from "next/link";
import type { ReactNode } from "react";
import { HomeBackdrop } from "@/domains/village/components/HomeBackdrop";
import { PixelIcon } from "@/shared/components/PixelIcon";
import { PixelPanel } from "@/shared/components/PixelPanel";

/** 개인정보·약관 문의와 삭제 요청을 받는 주소 (두 문서가 같이 쓴다) */
export const CONTACT_EMAIL = "02dassssh@gmail.com";

type Props = {
  title: string;
  updated: string;
  children: ReactNode;
  /** 페이지 맨 아래의 다른 문서 링크 */
  footer: ReactNode;
};

/**
 * 눈밭 위에 얹는 약관·개인정보 종이. 장식(우표·점선·체크)은 빼고 글만 또렷하게 둔다.
 * 문서 전체가 아니라 이 상자 안에서만 스크롤한다. 스크롤바가 생겼다 사라지며 폭이 바뀌거나,
 * 휴대폰 주소창이 접히며 화면 크기가 바뀌어 배경이 다시 그려지는 일을 막는다. 스크롤바는 숨긴다.
 */
export function LegalSheet({ title, updated, children, footer }: Props) {
  return (
    <main className="legal-scroll fixed inset-0 overflow-y-auto overscroll-contain bg-ground">
      <HomeBackdrop />
      {/* break-keep: 한국어 줄바꿈을 낱말 단위로 해서 "있지/만"처럼 글자가 혼자 떨어지지 않게 한다 */}
      <div className="relative z-10 mx-auto flex w-full max-w-[400px] flex-col gap-[calc(var(--p)*5)] px-[calc(var(--p)*4)] pt-[calc(var(--p)*6)] pb-[calc(var(--p)*10)] break-keep">
        <PixelPanel tone="paper" pad={0} className="relative flex flex-col" style={{ padding: "calc(var(--p) * 7) calc(var(--p) * 6)" }}>
          {/* 닫기: 다른 창과 같은 ✕ 단추로 첫 화면에 돌아간다 (단추 모양은 PixelButton과 같은 클래스) */}
          <Link
            href="/"
            aria-label="닫기"
            title="닫기"
            data-variant="secondary"
            className="pixel-box pixel-btn absolute top-[calc(var(--p)*4)] right-[calc(var(--p)*4)] inline-flex h-9 w-9 items-center justify-center"
          >
            <PixelIcon name="close" scale={2} />
          </Link>
          <header className="flex flex-col gap-[calc(var(--p)*2)] border-b-[length:var(--p)] border-paper-line pr-[calc(var(--p)*12)] pb-[calc(var(--p)*5)]">
            <p className="text-caption text-roof">데굴레터</p>
            <h1 className="text-title">{title}</h1>
            <p className="text-caption text-muted">{updated}</p>
          </header>
          <div className="flex flex-col gap-[calc(var(--p)*7)] pt-[calc(var(--p)*6)]">{children}</div>
        </PixelPanel>
        <nav className="text-caption flex w-fit gap-[calc(var(--p)*2)] self-center bg-paper px-[calc(var(--p)*3)] py-[var(--p)] text-ink">{footer}</nav>
      </div>
    </main>
  );
}

/** "1. 모으는 정보"처럼 앞에 번호가 있으면 번호만 빨간색으로 떼어 보여 준다 */
export function LegalSection({ heading, children }: { heading: string; children: ReactNode }) {
  const match = /^(\d+)\.\s*(.+)$/.exec(heading);
  return (
    <section className="flex flex-col gap-[calc(var(--p)*3)]">
      <h2 className="text-label flex gap-[calc(var(--p)*2)]">
        {match && <span className="text-roof">{match[1].padStart(2, "0")}</span>}
        <span>{match ? match[2] : heading}</span>
      </h2>
      <div className="text-body flex flex-col gap-[calc(var(--p)*2)] leading-[1.75]">{children}</div>
    </section>
  );
}

/** 본문 안 링크: 얇은 밑줄 하나로 통일 */
export const LEGAL_LINK = "text-ink underline decoration-1 underline-offset-[calc(var(--p)*1)]";

export function ContactMail() {
  return (
    <a className={LEGAL_LINK} href={`mailto:${CONTACT_EMAIL}`}>
      {CONTACT_EMAIL}
    </a>
  );
}

/** 한눈에 보기: 문서 맨 위의 짧은 요약. 흰 칸 하나에 점 목록 */
export function LegalSummary({ items }: { items: readonly string[] }) {
  return (
    <ul className="flex flex-col gap-[calc(var(--p)*3)] bg-snow px-[calc(var(--p)*5)] py-[calc(var(--p)*5)]">
      {items.map((item) => (
        <li key={item} className="text-body flex items-baseline gap-[calc(var(--p)*3)]">
          <span aria-hidden className="size-[calc(var(--p)*2)] shrink-0 translate-y-[calc(var(--p)*-1)] bg-roof" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

/** 항목 이름 아래에 설명을 쌓는 목록. 좁은 화면에서도 줄이 어색하게 꺾이지 않는다 */
export function LegalTable({ rows }: { rows: ReadonlyArray<readonly [string, string]> }) {
  return (
    <dl className="flex flex-col gap-[calc(var(--p)*4)]">
      {rows.map(([term, desc]) => (
        <div key={term} className="flex flex-col gap-[var(--p)]">
          <dt className="text-label">{term}</dt>
          <dd className="text-body leading-[1.75]">{desc}</dd>
        </div>
      ))}
    </dl>
  );
}

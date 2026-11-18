import type { Metadata } from "next";
import Link from "next/link";
import { LegalSection, LegalSheet } from "../privacy/LegalSheet";

export const metadata: Metadata = {
  title: "이용 약관",
  description: "데굴레터를 쓰는 방법, 편지가 열리는 날, 삭제 요청을 적습니다.",
};

const MAIL = "hansubin0411@gmail.com";

export default function TermsPage() {
  return (
    <LegalSheet
      title="이용 약관"
      updated="2026년 11월 18일부터"
      footer={
        <Link href="/privacy" className="text-ink">
          개인정보 처리방침
        </Link>
      }
    >
      <p className="text-body">
        데굴레터는 눈덩이를 굴려 친구의 마을에 눈사람을 세우고, 크리스마스에 열어 볼 편지를 남기는 웹 게임입니다.
      </p>

      <LegalSection heading="누가 쓰나">
        <p>마을을 만들려면 카카오 또는 구글로 로그인합니다. 한 계정에 마을은 하나입니다.</p>
        <p>친구 마을에 들어오는 사람은 로그인하지 않아도 눈사람을 세우고 편지를 쓸 수 있습니다.</p>
      </LegalSection>

      <LegalSection heading="편지">
        <p>편지 내용은 한국 시간 12월 25일 0시부터 그 마을 주인만 읽을 수 있습니다. 그 전에는 쓴 사람도 화면에서 다시 읽을 수 없습니다.</p>
        <p>남을 해치거나 법을 어기는 내용은 남기지 말아 주세요. 그런 내용은 삭제 요청을 받으면 지울 수 있습니다.</p>
      </LegalSection>

      <LegalSection heading="있는 그대로">
        <p>
          서비스는 지금 있는 모습 그대로 제공합니다. 크리스마스까지 눈사람과 편지가 남아 있도록 만들지만, 장애가 전혀 없을
          것을 약속하지는 않습니다.
        </p>
      </LegalSection>

      <LegalSection heading="문의와 삭제">
        <p>
          계정·마을·편지 삭제와 그 밖의 문의는{" "}
          <a className="text-ink underline decoration-[length:var(--p)] underline-offset-[calc(var(--p)*1)]" href={`mailto:${MAIL}`}>
            {MAIL}
          </a>
          으로 보내 주세요.
        </p>
        <p>
          개인정보를 어떻게 다루는지는 <Link href="/privacy">개인정보 처리방침</Link>에 적혀 있습니다.
        </p>
      </LegalSection>
    </LegalSheet>
  );
}

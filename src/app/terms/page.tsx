import type { Metadata } from "next";
import Link from "next/link";
import { ContactMail, LEGAL_LINK, LegalSection, LegalSheet, LegalSummary, LegalTable } from "../privacy/LegalSheet";

export const metadata: Metadata = {
  title: "이용 약관",
  description: "데굴레터를 쓰는 방법, 편지가 열리는 날, 지켜 주실 것, 문의를 적습니다.",
};

export default function TermsPage() {
  return (
    <LegalSheet
      title="이용 약관"
      updated="2026년 11월 18일부터"
      footer={
        <>
          <Link href="/">처음으로</Link>
          <span aria-hidden>·</span>
          <Link href="/privacy">개인정보 처리방침</Link>
        </>
      }
    >
      <LegalSummary
        items={[
          "마을은 카카오·구글로 로그인해서 하나만 만들 수 있어요",
          "친구 마을에는 로그인 없이 눈사람과 편지를 남길 수 있어요",
          "편지는 12월 25일에 마을 주인만 열어 볼 수 있어요",
        ]}
      />

      <LegalSection heading="1. 이용 방법">
        <LegalTable
          rows={[
            ["마을 주인", "카카오 또는 구글로 로그인하고 닉네임을 적으면 내 마을이 생겨요. 링크를 친구에게 보내요"],
            ["방문자", "링크로 들어와 눈덩이를 굴려 눈사람을 세우고, 주인에게 편지를 남겨요"],
          ]}
        />
      </LegalSection>

      <LegalSection heading="2. 편지">
        <p>편지는 한국 시간 12월 25일 0시부터 그 마을 주인만 읽을 수 있어요. 그 전에는 쓴 사람도 다시 열어 볼 수 없어요.</p>
      </LegalSection>

      <LegalSection heading="3. 지켜 주세요">
        <p>다른 사람을 해치거나, 놀리거나, 법을 어기는 눈사람과 편지는 남기지 말아 주세요.</p>
        <p>그런 내용은 알려 주시면 지울 수 있어요.</p>
      </LegalSection>

      <LegalSection heading="4. 서비스">
        <p>크리스마스까지 눈사람과 편지가 잘 남아 있도록 만들고 있지만, 오류가 전혀 없다고 약속하지는 못해요.</p>
        <p>
          정보를 어떻게 다루는지는{" "}
          <Link href="/privacy" className={LEGAL_LINK}>
            개인정보 처리방침
          </Link>
          에 적어 두었어요.
        </p>
      </LegalSection>

      <LegalSection heading="5. 문의·삭제 요청">
        <p>
          <ContactMail />로 보내 주세요.
        </p>
      </LegalSection>
    </LegalSheet>
  );
}

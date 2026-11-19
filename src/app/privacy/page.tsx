import type { Metadata } from "next";
import Link from "next/link";
import { ContactMail, LegalSection, LegalSheet, LegalSummary, LegalTable } from "./LegalSheet";

export const metadata: Metadata = {
  title: "개인정보 처리방침",
  description: "데굴레터가 어떤 정보를 왜 모으고, 얼마나 두고, 어떻게 지우는지 적습니다.",
};

export default function PrivacyPage() {
  return (
    <LegalSheet
      title="개인정보 처리방침"
      updated="2026년 11월 18일부터"
      footer={
        <>
          <Link href="/">처음으로</Link>
          <span aria-hidden>·</span>
          <Link href="/terms">이용 약관</Link>
        </>
      }
    >
      <LegalSummary
        items={[
          "이메일, 이름, 프로필 사진은 받지 않아요",
          "편지는 12월 25일 전에는 마을 주인도 못 읽어요",
          "지워 달라고 하시면 계정과 마을을 모두 지워요",
        ]}
      />

      <LegalSection heading="1. 모으는 정보">
        <LegalTable
          rows={[
            ["로그인 번호", "카카오·구글로 로그인할 때 받는 회원 번호. 다른 기기에서도 같은 사람인지 알아보는 데만 써요"],
            ["닉네임", "마을을 만들 때 직접 적는 이름. 마을 이름이 돼요"],
            ["눈사람·편지", "방문자가 직접 만든 눈사람 모양과 자리, 보낸 사람 이름, 편지 내용"],
            ["방문 표시", "로그인하지 않은 방문자를 구분하는 임시 번호"],
          ]}
        />
        <p>광고나 방문 분석을 위해서는 아무것도 모으지 않아요.</p>
      </LegalSection>

      <LegalSection heading="2. 편지 보호">
        <p>편지는 쓴 사람도, 마을 주인도 브라우저에서 바로 읽을 수 없게 저장해요.</p>
        <p>한국 시간 12월 25일 0시부터 마을 주인에게만 서버가 꺼내서 보여 줘요.</p>
      </LegalSection>

      <LegalSection heading="3. 보관과 삭제">
        <p>계정, 마을, 눈사람, 편지는 지워 달라는 요청이 있을 때까지 보관해요. 크리스마스가 지나도 주인은 편지를 다시 읽을 수 있어요.</p>
        <p>요청하시면 그 계정과 마을, 마을에 달린 눈사람과 편지를 모두 지워요.</p>
      </LegalSection>

      <LegalSection heading="4. 맡기는 곳">
        <LegalTable
          rows={[
            ["Appwrite", "계정, 마을, 눈사람, 편지 저장"],
            ["Vercel", "사이트와 서버 운영"],
            ["카카오·구글", "로그인 확인만. 편지와 눈사람 내용은 보내지 않아요"],
          ]}
        />
        <p>그 밖의 곳에 정보를 팔거나 넘기지 않아요.</p>
      </LegalSection>

      <LegalSection heading="5. 쿠키와 브라우저 저장">
        <p>로그인하는 10분 동안만 안전 확인용 쿠키를 써요. 로그인 상태와 이미 연 편지 목록은 이 브라우저에만 저장돼요.</p>
      </LegalSection>

      <LegalSection heading="6. 문의·삭제 요청">
        <p>
          <ContactMail />로 보내 주세요. 어떤 마을인지, 카카오와 구글 중 무엇으로 로그인했는지 적어 주시면 빨리 찾을 수 있어요.
        </p>
      </LegalSection>
    </LegalSheet>
  );
}

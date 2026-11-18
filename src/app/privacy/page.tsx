import type { Metadata } from "next";
import Link from "next/link";
import { LegalSection, LegalSheet } from "./LegalSheet";

export const metadata: Metadata = {
  title: "개인정보 처리방침",
  description:
    "데굴레터가 카카오 회원번호, 구글 sub, 닉네임, 눈사람과 편지, 익명 세션을 왜 다루고 어디에 두는지 적습니다.",
};

const MAIL = "hansubin0411@gmail.com";

export default function PrivacyPage() {
  return (
    <LegalSheet
      title="개인정보 처리방침"
      updated="2026년 11월 18일부터"
      footer={
        <Link href="/terms" className="text-ink">
          이용 약관
        </Link>
      }
    >
      <p className="text-body">
        데굴레터는 친구 마을에 눈사람을 세우고, 크리스마스에 열어 볼 편지를 남기는 웹 게임입니다. 여기에 어떤 정보를 왜
        남기는지 적습니다.
      </p>

      <LegalSection heading="무엇을 모으나">
        <p>로그인과 마을, 눈사람, 편지를 위해 아래만 다룹니다. 광고를 위해 모으지 않습니다.</p>
        <ul className="flex list-none flex-col gap-[calc(var(--p)*2)] pl-[calc(var(--p)*1)]">
          <li>카카오 회원번호. 카카오로 로그인할 때만, 같은 사람인지 알아보려고 받습니다. 이름·프로필 사진·이메일은 받지 않습니다.</li>
          <li>구글 sub. 구글로 로그인할 때만, 같은 목적으로 받습니다. 범위는 openid뿐이고 이메일·이름은 받지 않습니다.</li>
          <li>닉네임. 마을 주인이 직접 적습니다. 마을 이름이 됩니다.</li>
          <li>눈사람과 편지. 방문자가 직접 만듭니다. 눈사람의 모양·자리·만든 사람 이름, 편지의 보낸 사람 이름과 내용입니다.</li>
          <li>익명 세션 식별자. 로그인하지 않은 방문자를 구분하려고 Appwrite가 만듭니다.</li>
        </ul>
      </LegalSection>

      <LegalSection heading="왜 쓰나">
        <p>마을을 만들고, 다른 기기에서 같은 마을을 다시 찾기 위해서입니다.</p>
        <p>방문자가 남긴 눈사람과 편지를 그 마을에 붙여 두기 위해서입니다.</p>
        <p>편지는 한국 시간 12월 25일 0시부터 마을 주인만 읽게 하려고, 그 전에는 브라우저에서 읽지 못하게 둡니다.</p>
      </LegalSection>

      <LegalSection heading="어디에 두나">
        <p>위 정보는 Appwrite Cloud에 저장합니다. 데굴레터는 따로 서버를 두지 않습니다.</p>
        <p>편지 표에는 읽기 권한이 없습니다. 12월 25일 이후 마을 주인일 때만 서버가 읽어서 보여 줍니다.</p>
      </LegalSection>

      <LegalSection heading="얼마나 두나">
        <p>편지는 크리스마스가 지난 뒤에도 주인이 읽을 수 있게 둡니다. 삭제 요청이 오면 지웁니다.</p>
        <p>계정과 마을은 탈퇴(삭제) 요청이 있을 때까지 둡니다. 요청하면 계정, 그 계정의 마을, 그 마을에 달린 눈사람과 편지를 지웁니다.</p>
      </LegalSection>

      <LegalSection heading="삭제 요청">
        <p>
          <a className="text-ink underline decoration-[length:var(--p)] underline-offset-[calc(var(--p)*1)]" href={`mailto:${MAIL}`}>
            {MAIL}
          </a>
          으로 적어 주세요. 어떤 마을인지, 어떤 로그인(카카오 또는 구글)인지 알려 주시면 찾습니다.
        </p>
      </LegalSection>

      <LegalSection heading="다른 곳에 넘기나">
        <p>편지와 눈사람 내용을 팔거나, 광고 회사에 넘기지 않습니다.</p>
        <p>
          로그인을 마치려고 카카오 또는 구글 화면으로 이동합니다. 그 서비스는 자기 계정 로그인만 처리하고, 편지 내용은 받지
          않습니다. 저장은 Appwrite Cloud가 맡습니다. 그 밖에는 제3자에게 제공하지 않습니다.
        </p>
      </LegalSection>

      <LegalSection heading="쿠키와 이 브라우저 저장">
        <p>광고나 방문 분석 쿠키는 쓰지 않습니다.</p>
        <p>로그인을 시작하는 동안, 그 요청이 중간에 바뀌지 않았는지 확인하는 쿠키를 10분 동안만 둡니다. 브라우저의 자바스크립트는 읽지 못합니다.</p>
        <p>로그인이 끝나면 세션은 Appwrite가 이 브라우저에 저장합니다. 로그아웃하면 그 세션을 지웁니다.</p>
        <p>어떤 편지를 이미 열었는지는 이 브라우저의 localStorage에만 적습니다. 키 이름은 degul:read-letters이고, 서버로 보내지 않습니다.</p>
      </LegalSection>

      <LegalSection heading="문의">
        <p>
          개인정보에 대한 질문은{" "}
          <a className="text-ink underline decoration-[length:var(--p)] underline-offset-[calc(var(--p)*1)]" href={`mailto:${MAIL}`}>
            {MAIL}
          </a>
          으로 보내 주세요.
        </p>
      </LegalSection>
    </LegalSheet>
  );
}

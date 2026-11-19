"use client";

import Image from "next/image";
import localFont from "next/font/local";
import kakaoLogin from "../assets/kakao_login_kr_large.svg";

// 구글 로그인 단추만 공식 글꼴을 쓴다. 나머지 화면은 갈무리체 그대로다.
// Roboto Medium: Apache 2.0. Noto Sans KR Medium(이 문구에 쓰는 글자만): SIL Open Font License 1.1.
const roboto = localFont({
  src: "../assets/Roboto-Medium.ttf",
  weight: "500",
  display: "swap",
});
const noto = localFont({
  src: "../assets/NotoSansKR-Medium.ttf",
  weight: "500",
  display: "swap",
});

type Props = {
  onKakao: () => void;
  /** 없으면 Google 단추를 숨긴다 */
  onGoogle?: () => void;
  /** 로그인 페이지로 넘어가는 중이면 단추를 잠근다 */
  busy?: boolean;
};

/** 로그인 수단 단추. 카카오·구글 모두 각 가이드의 표준 단추를 쓴다. */
export function LoginMethods({ onKakao, onGoogle, busy = false }: Props) {
  return (
    <div className="flex w-full flex-col gap-[calc(var(--p)*4)]">
      <KakaoLoginButton disabled={busy} onClick={onKakao} />
      {onGoogle && <GoogleSignInButton disabled={busy} onClick={onGoogle} />}
    </div>
  );
}

/**
 * 카카오 로그인 버튼: 카카오가 제공하는 표준 버튼 그림을 그대로 쓴다 (가이드는 표준 디자인 사용을 권장한다).
 * 그림은 카카오 개발자 사이트 [도구 > 리소스 다운로드 > 카카오 로그인]의 Kakao Login.zip 안 SVG/kakao_login_kr_large.svg.
 * 가로세로 비율을 지킨 채 카드 폭에 맞춰 늘리고 줄이기만 한다 (색·모양·글자는 손대지 않는다).
 */
function KakaoLoginButton({ disabled, onClick }: { disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label="카카오 로그인"
      className="block w-full transition-opacity disabled:opacity-60"
    >
      <Image src={kakaoLogin} alt="" unoptimized priority className="h-auto w-full" />
    </button>
  );
}

/**
 * Google로 로그인. 구글 브랜드 가이드의 표준 라이트 버튼이다.
 * 배경 #FFFFFF, 테두리 1px #747775, 글자 #1F1F1F, 높이 40px, 모서리 4px, 공식 G 로고.
 * 색·로고·문구를 픽셀로 다시 그리지 않는다. 가로만 카드 폭에 맞춘다.
 */
function GoogleSignInButton({ disabled, onClick }: { disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label="Google로 로그인"
      className="flex h-10 w-full items-center justify-center gap-2.5 rounded border border-[#747775] bg-white px-3 text-[14px] leading-5 font-medium text-[#1F1F1F] transition-colors hover:bg-[#F8F9FA] active:bg-[#F1F3F4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1F1F1F] disabled:opacity-60"
    >
      <GoogleG />
      <span className="inline-flex items-baseline">
        <span className={roboto.className}>Google</span>
        <span className={`${noto.className} inline-flex items-center`}>로 로그인</span>
      </span>
    </button>
  );
}

/** 구글이 로그인 버튼에 쓰도록 공개한 네 색 G. 색과 모양을 바꾸지 않는다. */
function GoogleG() {
  return (
    <svg aria-hidden width="18" height="18" viewBox="0 0 48 48" className="shrink-0">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

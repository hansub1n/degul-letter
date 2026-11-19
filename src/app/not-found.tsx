import type { Metadata } from "next";
import { ErrorScreen } from "@/domains/village";

export const metadata: Metadata = {
  title: "페이지를 찾을 수 없어요",
  robots: { index: false, follow: false },
};

/** 없는 주소로 들어왔을 때. 기본 Next 404 대신 데굴레터 눈밭 안내를 보여 준다. */
export default function NotFound() {
  return <ErrorScreen title="길을 잃었어요" description="주소를 다시 확인해 주세요" />;
}

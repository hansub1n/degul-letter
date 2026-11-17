// 환경 변수 모음. 값은 프로젝트 루트의 .env.local 에 넣는다 (.env.example 참고).
// NEXT_PUBLIC_ 으로 시작하는 값은 브라우저에도 그대로 보인다. 비밀 키는 여기에 두지 않는다.

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`환경 변수 ${name} 이(가) 비어 있어요. .env.local 을 확인해 주세요.`);
  }
  return value;
}

// Next.js는 process.env.이름 을 그대로 써야 빌드 때 값을 채워 넣는다. 그래서 하나씩 직접 적는다.
export const env = {
  get appwriteEndpoint() {
    return required("NEXT_PUBLIC_APPWRITE_ENDPOINT", process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT);
  },
  get appwriteProjectId() {
    return required("NEXT_PUBLIC_APPWRITE_PROJECT_ID", process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID);
  },
  get appwriteDatabaseId() {
    return required("NEXT_PUBLIC_APPWRITE_DATABASE_ID", process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID);
  },
};

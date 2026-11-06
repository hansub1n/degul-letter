# 데굴레터 (degul-letter)

눈덩이를 굴려 친구의 마을에 눈사람을 세우고, 크리스마스에 열어 볼 편지를 남기는 2D 도트 웹 게임.
목표: 12/1 전에 배포 (`degul-letter.vercel.app`), 12/25에 편지 공개.

## 핵심 흐름

1. 마을 주인: 카카오 로그인 → 마을 만들기 → 공유 링크(`/v/[code]`) 받기
2. 방문자(로그인 없음): 링크로 입장 → 캐릭터로 걸어 다니며 눈덩이 굴리기·쌓기 → 꾸미기(맨 위 눈덩이에 도트로 얼굴 그리기, 소품, 색) → 편지 쓰기 → 저장
3. 12/25 이후: 주인만 눈사람을 눌러 편지 읽기 (그 전엔 D-day 표시)

## 기술 스택

- Next.js (App Router) + TypeScript, 패키지 매니저 **pnpm**
- 게임: Canvas API 직접 구현 (게임 엔진 라이브러리 쓰지 않기)
- 백엔드: Appwrite (Database, Auth, Functions) — Supabase 아님
- 로그인: Appwrite OAuth2 카카오, 마을 주인만
- 배포: Vercel

## 폴더 구조 (도메인 단위)

```
src/
  app/          라우트만 (/, /v/[code])
  domains/
    village/    마을 캔버스 게임(lib/engine.ts), 마을 만들기, 공유 링크
    snowman/    눈사람 꾸미기(얼굴 그리기, 소품), 저장
    letter/     편지 쓰기, 25일 잠금, 열기
    auth/       카카오 로그인
  shared/       Appwrite 클라이언트, 환경 변수, 공통 UI
```

- 각 도메인 안은 `components/`, `hooks/`, `lib/`, `api.ts`, `types.ts`로 나눈다.
- 다른 도메인 코드는 그 도메인의 `index.ts`로만 import한다.

## 데이터 (Appwrite 컬렉션)

- `villages`: ownerId, name, code
- `snowmen`: villageId, x, y, balls[{r}], decorations[], face(도트 얼굴 그림 데이터), authorName
- `letters`: snowmanId, villageId, content — 클라이언트에서 직접 읽기 금지. 25일 이후 + 주인일 때만 Appwrite Function으로 내려준다.

## 작업 규칙

- 답변과 설명은 한국어로.
- 나는 사장, 에이전트는 부하직원처럼 일한다.
  - 보고는 결과부터: 무엇을 했고 확인했는지, 무엇이 남았는지 짧게.
  - 방향을 정하는 일(기능 추가, 기술 선택 등)은 추천안을 붙여 나에게 올리고, 내가 정하면 실행한다.
  - 지시한 방법에 위험이 보이면 그대로 진행하지 말고 먼저 말한다.
- 만들 기능은 아래 순서대로 진행한다. 앞 단계가 동작한 뒤 다음으로 넘어간다.
  1. 굴리기·쌓기 게임 옮기기
  2. 마을 만들기·공유 링크·눈사람 저장
  3. 꾸미기: 소품 붙이기, 도트 얼굴 그리기, 색 바꾸기, 시즌 소품(산타 모자, 루돌프 뿔 등)
  4. 편지 쓰기·25일 잠금·편지 열기
  5. 마을 이미지로 저장해서 공유하기
- 이 목록에 없는 새 기능은 먼저 제안만 하고, 내가 정하면 구현한다.
- `domains/village/lib/engine.ts`는 시제품에서 옮긴 코드라 `@ts-nocheck` 상태. 고칠 때는 동작을 바꾸지 말고 타입을 조금씩 붙인다.
- 새 개념은 처음 배우는 사람에게 설명하듯 단계적으로 설명한다.

## 커밋

- 직접 커밋하지 않는다. 작업 단위가 끝나면 변경 파일 목록과 커밋 메시지를 **제안만** 하고, 내가 확인한 뒤 커밋한다.
- 형식: `feat:`, `fix:`, `refactor:`, `style:`, `docs:`, `chore:` + 한국어 요약. 필요하면 본문에 바뀐 이유를 적는다.

## 블로그(velog) 소재 기록

`docs/devlog/`는 `.gitignore`에 들어 있어 레포에 올리지 않는다. 로컬에만 둔다.

나중에 기능별 글을 쓸 수 있도록, 작업하면서 소재를 `docs/devlog/`에 계속 쌓는다.

- 파일: 기능 하나당 하나 (`01-rolling-snowball.md`, `02-village-share-link.md`, `03-decorate-face-drawing.md` ...)
- 각 파일에 아래 항목을 채운다.
  - **기획:** 이 기능을 왜 이렇게 만들었는지, 고려한 다른 선택지와 고르지 않은 이유
  - **구현:** 핵심 로직과 코드 조각, 처음 쓴 개념은 처음 배우는 사람도 이해하게 단계적으로 설명
  - **트러블슈팅:** 문제 상황 → 원인 → 해결 → 결과, 에러 메시지와 전후 코드
  - **회고:** 아쉬운 점, 다음에 다르게 할 점
- 소재는 다양하게 남긴다: 기능 구현, 기술 선택(Appwrite, Canvas, 도메인 구조), 성능, 모바일 대응, 배포 이슈, 기획 변경(3D → 2D 도트 등).
- 내 경험이나 생각은 지어내지 않는다. 기술적 사실(무엇을 했고 왜 동작하는지)은 바로 기록하고, 내 느낌·판단·이유가 필요한 부분은 `[질문: ...]`으로 남겨 두고 나에게 물어본 뒤 채운다.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

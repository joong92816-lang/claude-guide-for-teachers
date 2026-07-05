# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

**선생님을 위한 클로드 코드 가이드** — 초·중·고 교사가 수업·행정·평가·학생 지도에
AI를 쉽게 활용하도록 돕는 Next.js(App Router) 서비스. Q&A 챗, MDX 기반 가이드/튜토리얼,
업데이트 노트, 그리고 새 소식을 자동 감지하는 파이프라인으로 구성된다.

## 최우선 안전 규칙 (모든 작업에 적용)

- **정책 위반 요청은 즉시 중단**: 클로드/Anthropic 이용 정책을 위반할 소지가 있는 작업
  (학생 실명·연락처 등 개인정보 하드코딩, 무단 크롤링, 인증 우회, 저작물 무단 복제 등)을
  받으면 **진행하지 말고 경고와 이유를 밝힌 뒤 멈춘다.**
- **앱 Q&A 도 동일**: 위반 소지 질문 → 경고 표시 → 응답 중단. 이 로직은 `lib/guardrail.ts`
  (사전 필터)와 `lib/system-prompt.ts`(안전 규칙)에 있으며 **임의로 약화하지 않는다.**
- **학생 개인정보 금지**: 실명·연락처·주민번호·사진 등을 입력/저장하도록 유도하는 UI·프롬프트를
  만들지 않는다. 사용자가 제공하려 하면 익명화를 먼저 권한다.
- **평가·판단은 사람이**: 학생 답안을 그대로 생성하거나 학생을 서열화·낙인찍는 기능을 만들지 않는다.
- **초안 전제 유지**: 모델 출력이 초안이라는 안내(챗 하단 문구, 자동 노트 초안 배너)를 제거하지 않는다.
- **API 키는 서버 전용**: API 키(현재 `GEMINI_API_KEY`)는 서버 환경변수로만 쓰고
  **클라이언트 번들에 노출하지 않는다.** 코드에 하드코딩 금지.
- 시스템 프롬프트 수정 시 안전 규칙 섹션을 유지하고, 동적 값(날짜·사용자 ID 등)을 프롬프트
  접두부에 넣지 않는다(prompt caching 이 깨진다).

## 콘텐츠 규칙

- 모든 가이드는 **6단 템플릿**을 따른다: ①한 줄 요약 → ②쉬운 설명 → ③교육 사례 →
  ④따라 하기 → ⑤실수와 팁 → ⑥공식 링크.
- 제품 사양(요금·한도·모델명)은 단정하지 말고 **공식 문서 링크로 안내**한다:
  - 클로드 문서: https://docs.claude.com
  - 클로드 코드 문서: https://docs.claude.com/en/docs/claude-code/overview
  - 지원 센터: https://support.claude.com
- 공식 문서 원문을 그대로 복사하지 않고 **교사의 언어로 재작성**한다.
- 전문용어는 풀어 쓰고 원어를 괄호 병기한다. (예: "프롬프트(prompt, AI에게 주는 지시문)")

## 코드 규칙

- 컴포넌트는 **서버 컴포넌트 기본**, 상호작용이 필요할 때만 `"use client"`.
- **접근성**: 키보드 포커스 표시, 명도 대비 AA, `prefers-reduced-motion` 존중.
- 커밋 전 **`npm run lint && npm run build` 통과**를 확인한다.

## 구현 순서 (한 단계씩, 완료 후 사용자 확인)

1. 레이아웃 + 가이드 MDX 렌더 + **검색** — ✅ 레이아웃·가이드 렌더 완료 / ⬜ 검색 미구현
2. Q&A 챗 (가드레일 포함) — ✅ 완료 (Gemini 백엔드)
3. 튜토리얼 2코스 — ✅ 완료 (코스 A/B)
4. 업데이트 모니터링 파이프라인 — ✅ 완료 (해시 스냅샷 비교 · 키 불필요)
5. FAQ · 프롬프트 갤러리 · 피드백 · 인쇄 · 다크모드 — ⬜ 예정

> 참고: 기존 가이드(`content/guides/*.mdx`)는 초기 6단 라벨(이럴 때 써요/준비물/예시 프롬프트/
> 주의할 점)을 쓴다. 콘텐츠 단계에서 위 새 6단 템플릿(교육 사례·실수와 팁·공식 링크 포함)으로
> 점진 이관한다.

## 명령어

```bash
npm run dev      # 개발 서버 (http://localhost:3000)
npm run build    # 프로덕션 빌드
npm run start    # 빌드 결과 실행
npm run lint     # ESLint (next/core-web-vitals)
npm run monitor  # (선택) 소식 모니터링 → 변경 감지 시 content/updates 초안 (키 불필요)
```

환경변수: `.env.local.example` 를 복사해 `.env.local` 을 만들고 `GEMINI_API_KEY`(무료, 필수)를
채운다. 무료 발급: https://aistudio.google.com/apikey . `.env.local` 은 절대 커밋 금지.

## 아키텍처

- **Q&A 파이프라인** (`app/api/chat/route.ts`): 요청은 세 관문을 통과한다 —
  ① `lib/rate-limit.ts`(IP별 속도 제한) → ② `lib/guardrail.ts`(정책 사전 필터, 위반 시
  모델 호출 없이 경고 반환) → ③ Google Gemini(`@google/genai`) 스트리밍 호출.
  `systemInstruction` = `SYSTEM_PROMPT + 지식 베이스`. 모델은 `GEMINI_MODEL`(기본
  `gemini-2.5-flash`). 응답은 `text/plain` 토큰 스트림이고 `app/chat/ChatClient.tsx` 가
  `ReadableStream` 으로 읽는다.

- **지식 베이스** (`lib/knowledge.ts`): `/content` 의 모든 MDX 본문을 하나의 텍스트로 합쳐
  system 프롬프트 뒤에 근거로 붙인다. 모듈 레벨 캐시(`clearKnowledgeCache()` 로 무효화).

- **콘텐츠 시스템** (`lib/mdx.ts` + `content/`): 파일 기반. `gray-matter` 로 프론트매터를
  분리하고 `next-mdx-remote/rsc` 의 `compileMDX` 로 서버 렌더링(`app/components/MdxContent.tsx`).
  - `content/guides/*.mdx` — 6단 템플릿(①한 줄 요약 ~ ⑥주의할 점). `order` 로 정렬.
  - `content/tutorials/*.mdx` — `course` 프론트매터로 코스를 묶고 `order` 로 단계 순서.
    진도는 `ProgressTracker`(client)가 `localStorage["tutorial-progress"]` 에 저장.
  - `content/updates/*.mdx` — `date` 내림차순. 초안은 모니터링 파이프라인이 생성.

- **모니터링 파이프라인** (`scripts/monitor-updates.mts` + `.github/workflows/monitor.yml`):
  매일 cron 으로 공식 소스(docs 사이트맵·claude-code 문서맵·npm 패키지)를 받아 **SHA-256
  해시를 이전 스냅샷(`.update-snapshots/`)과 비교**한다. 변경이 있으면 `content/updates/` 에
  검수용 초안(`status: draft`)을 만들고 `peter-evans/create-pull-request` 로 PR 을 연다.
  **LLM/키가 필요 없고**(해시 비교만), **자동 병합하지 않는다**(사람 검수 후 머지).

## 모델 / API 규칙

- **챗**: Google Gemini(`@google/genai`), `GEMINI_MODEL`(기본 `gemini-2.5-flash`, 무료 티어).
  긴 응답은 `generateContentStream` 으로 스트리밍한다. 키는 `GEMINI_API_KEY` 환경변수.
- **모니터(선택)**: `scripts/monitor-updates.mts` 는 해시 비교만 하므로 **API 키가 없다**.
  `@google/genai` 는 이제 챗(`route.ts`)에서만 쓴다. 모니터를 안 쓰면
  `.github/workflows/monitor.yml` 을 비활성화하면 된다.
- API 키는 코드에 넣지 않고 환경변수로만 주입한다.

## 배포 (Netlify)

- `netlify.toml` + `@netlify/plugin-nextjs` 로 배포. SSR·`/api/chat` 은 Netlify Functions.
- `GEMINI_API_KEY` 를 Netlify 환경변수에 설정(저장소 커밋 금지). Node 22.
- **중요**: `/chat`(레이아웃 Sidebar)와 `/api/chat`(지식 베이스)는 런타임에 `fs` 로
  `content/` 를 읽는다. 경로가 동적 조합이라 자동 트레이싱이 안 되므로
  `next.config.mjs` 의 `outputFileTracingIncludes` 로 `content/**` 를 함수 번들에
  포함시킨다. content 를 읽는 새 동적 라우트를 추가하면 이 목록에 경로를 추가할 것.

## 알려진 한계

- `lib/rate-limit.ts` 는 인메모리라 서버리스/멀티 인스턴스에서는 인스턴스별로 카운트된다.
  엄격한 제한이 필요하면 Redis/Upstash 등 공유 저장소로 교체한다.
- 챗 답변은 현재 마크다운을 `whitespace-pre-wrap` 로 표시한다(별도 렌더러 없음).

# 선생님을 위한 클로드 코드 가이드

초·중·고 교사가 수업·행정·평가·학생 지도에 AI(클로드 코드)를 쉽게 활용하도록 돕는
Next.js 서비스입니다. Q&A 챗, 기능 가이드, 튜토리얼, 새 소식으로 구성됩니다.

## 빠른 시작

```bash
# 1) 의존성 설치
npm install

# 2) 환경변수 설정
cp .env.local.example .env.local
#   .env.local 을 열어 ANTHROPIC_API_KEY 를 채우세요 (절대 커밋 금지)

# 3) 개발 서버 실행
npm run dev
#   http://localhost:3000
```

## 주요 명령어

| 명령어            | 설명                                          |
| ----------------- | --------------------------------------------- |
| `npm run dev`     | 개발 서버                                     |
| `npm run build`   | 프로덕션 빌드                                 |
| `npm run start`   | 빌드 결과 실행                                |
| `npm run lint`    | ESLint 검사                                   |
| `npm run monitor` | 소식 모니터링 → `content/updates` 초안 생성   |

## 콘텐츠 추가하기

- **가이드**: `content/guides/*.mdx` (6단 템플릿, `order` 로 정렬)
- **튜토리얼**: `content/tutorials/*.mdx` (`course` 로 코스 묶기, `order` 로 단계)
- **소식**: `content/updates/*.mdx` (`date` 내림차순)

프론트매터 예시는 기존 파일을 참고하세요. 저장하면 사이드바·목록에 자동 반영됩니다.

## Netlify 배포 (GitHub 연동)

이 프로젝트는 [Netlify](https://www.netlify.com/) 배포용으로 설정되어 있습니다
(`netlify.toml` + `@netlify/plugin-nextjs`). SSR 페이지와 `/api/chat` 는 Netlify
Functions 로 실행되어 AI 챗까지 동작합니다.

1. 저장소를 GitHub 에 올립니다.
2. Netlify → **Add new site → Import an existing project** 로 저장소를 연결합니다.
   빌드 명령(`npm run build`)과 플러그인은 `netlify.toml` 에서 자동 인식됩니다.
3. **Site configuration → Environment variables** 에 `ANTHROPIC_API_KEY` 를 추가합니다.
   (⚠️ 저장소에 커밋하지 마세요. 이 값이 없으면 챗 응답이 동작하지 않습니다.)
4. 배포 후 발급되는 `https://<사이트이름>.netlify.app` 주소로 접속합니다.
   이후 `main` 에 push 할 때마다 자동으로 재배포됩니다.

> 참고: `content/` 의 MDX 파일은 런타임에 읽히므로 `next.config.mjs` 의
> `outputFileTracingIncludes` 로 함수 번들에 포함됩니다. 콘텐츠 관련 경로를
> 바꾸면 이 설정도 함께 확인하세요.

## 구조와 규칙

자세한 아키텍처·모델 규칙·안전 규칙은 [`CLAUDE.md`](./CLAUDE.md) 를 참고하세요.

> ⚠️ 학생 개인정보(실명·연락처 등)를 입력하지 마세요. AI 답변은 초안이며, 배포 전 검토가 필요합니다.

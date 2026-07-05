/**
 * 공식 문서/뉴스 변경 감지 → 업데이트 노트 PR 초안 생성 (Google Gemini · 무료).
 *
 * 동작:
 *   1) Gemini + Google 검색 그라운딩으로 클로드/교육 AI 관련 최근 소식을 조사.
 *   2) 정말 새 소식이 있으면 content/updates/ 에 초안 MDX 파일을 생성.
 *   3) GitHub Actions(.github/workflows/monitor.yml)가 이 파일 변경을 감지해
 *      PR 초안을 자동으로 엽니다.
 *
 * 실행:  npm run monitor      (로컬)
 *        GitHub Actions cron  (매일 자동)
 *
 * 환경변수:
 *   GEMINI_API_KEY  (필수·무료) — https://aistudio.google.com/apikey
 *   GEMINI_MODEL    (선택)       — 기본값 gemini-2.5-flash
 *
 * 이 스크립트는 Node 런타임에서 직접 실행됩니다(.mts, --experimental-strip-types).
 * 초안은 사람이 검토·수정한 뒤 병합하는 것을 전제로 합니다. (자동 병합 금지)
 *
 * 참고: Gemini 는 Google 검색 그라운딩과 구조화 출력(responseSchema)을 동시에 쓸 수
 * 없으므로, 프롬프트로 JSON 을 요청하고 응답에서 JSON 을 관대하게 파싱합니다.
 */
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { GoogleGenAI } from "@google/genai";

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const UPDATES_DIR = path.join(process.cwd(), "content", "updates");

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("[monitor] GEMINI_API_KEY 가 설정되지 않았습니다.");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

type Draft = {
  hasNews: boolean;
  title: string;
  summary: string;
  body: string; // 마크다운 본문
};

const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

const RESEARCH_PROMPT = `당신은 한국 교사용 'AI(클로드 코드) 활용' 서비스의 소식 편집자입니다.
Google 검색으로, 지난 2주 이내에 나온 다음 주제의 변화를 조사하세요:
- 클로드(Claude)/클로드 코드의 새 기능이나 교육 활용 소식
- 교육 현장의 생성형 AI 활용 가이드라인·정책 변화 (특히 한국)

정말로 새롭고 교사에게 의미 있는 소식이 있을 때만 초안을 작성하세요.
없으면 hasNews 를 false 로 두세요. 추측이나 과장은 금지입니다.

응답은 아래 형식의 JSON "하나만" 출력하세요. 다른 설명은 붙이지 마세요.
{
  "hasNews": true 또는 false,
  "title": "간결한 제목",
  "summary": "한 줄 요약",
  "body": "교사가 이해하기 쉬운 존댓말 마크다운 본문 (3~5문장 + 핵심 목록)"
}`;

/** 응답 텍스트에서 JSON 객체를 관대하게 추출. */
function extractJson(text: string): Draft {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fence ? fence[1] : text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error("응답에서 JSON 을 찾지 못했습니다.");
  }
  return JSON.parse(raw.slice(start, end + 1)) as Draft;
}

function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
  return `${today}-${base || "update"}`;
}

function toMdx(d: Draft): string {
  const fm = [
    "---",
    `title: ${JSON.stringify(d.title)}`,
    `description: ${JSON.stringify(d.summary)}`,
    `date: ${JSON.stringify(today)}`,
    "tags: [자동초안]",
    "---",
    "",
  ].join("\n");
  const notice =
    "> ⚠️ 이 노트는 자동 파이프라인이 만든 **초안**입니다. 검토 후 다듬어 병합하세요.\n\n";
  return fm + notice + d.body.trim() + "\n";
}

async function main() {
  console.log("[monitor] 소식 조사 시작…");

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: RESEARCH_PROMPT,
    config: {
      // Google 검색 그라운딩으로 최신 정보를 조사.
      tools: [{ googleSearch: {} }],
      maxOutputTokens: 2048,
    },
  });

  const text = response.text;
  if (!text) {
    console.error("[monitor] 응답이 비어 있습니다.");
    process.exit(1);
  }

  let draft: Draft;
  try {
    draft = extractJson(text);
  } catch (e) {
    console.error("[monitor] JSON 파싱 실패:", text.slice(0, 300));
    process.exit(1);
  }

  if (!draft.hasNews) {
    console.log("[monitor] 새 소식 없음. 초안을 만들지 않습니다.");
    return;
  }

  await mkdir(UPDATES_DIR, { recursive: true });
  const slug = slugify(draft.title);
  const file = path.join(UPDATES_DIR, `${slug}.mdx`);
  await writeFile(file, toMdx(draft), "utf8");
  console.log(`[monitor] 초안 생성됨: content/updates/${slug}.mdx`);
}

main().catch((err) => {
  console.error("[monitor] 실행 오류:", err);
  process.exit(1);
});

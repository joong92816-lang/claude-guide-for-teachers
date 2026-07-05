/**
 * 공식 문서/뉴스 변경 감지 → 업데이트 노트 PR 초안 생성.
 *
 * 동작:
 *   1) Claude Opus 4.8 + 웹 검색(server tool)으로 클로드 코드 / 교육 활용 관련
 *      최근 소식을 조사.
 *   2) 결과가 있으면 content/updates/ 에 초안 MDX 파일을 생성.
 *   3) GitHub Actions(.github/workflows/monitor.yml)가 이 파일 변경을 감지해
 *      PR 초안을 자동으로 엽니다.
 *
 * 실행:  npm run monitor      (로컬)
 *        GitHub Actions cron  (매일 자동)
 *
 * 이 스크립트는 Node 런타임에서 직접 실행됩니다(.mts, --experimental-strip-types).
 * 초안은 사람이 검토·수정한 뒤 병합하는 것을 전제로 합니다. (자동 병합 금지)
 */
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-opus-4-8";
const UPDATES_DIR = path.join(process.cwd(), "content", "updates");

const client = new Anthropic();

type Draft = {
  hasNews: boolean;
  title: string;
  date: string; // YYYY-MM-DD
  summary: string;
  body: string; // 마크다운 본문
};

const RESEARCH_PROMPT = `당신은 한국 교사용 'AI(클로드 코드) 활용' 서비스의 소식 편집자입니다.
지난 2주 이내에 나온, 교사에게 유용한 다음 주제의 변화를 웹에서 조사하세요:
- 클로드/클로드 코드의 새 기능이나 교육 활용 소식
- 교육 현장의 생성형 AI 활용 가이드라인·정책 변화 (특히 한국)

정말로 새롭고 교사에게 의미 있는 소식이 있을 때만 초안을 작성하세요.
없으면 hasNews=false 로 답하세요. 추측이나 과장은 금지입니다.
본문(body)은 교사가 이해하기 쉬운 존댓말 마크다운으로, 3~5문장 + 핵심 목록으로 작성하세요.
날짜(date)는 오늘 날짜를 YYYY-MM-DD 로 넣으세요.`;

const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    hasNews: { type: "boolean" },
    title: { type: "string" },
    date: { type: "string" },
    summary: { type: "string" },
    body: { type: "string" },
  },
  required: ["hasNews", "title", "date", "summary", "body"],
  additionalProperties: false,
} as const;

function slugify(title: string, date: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
  return `${date}-${base || "update"}`;
}

function toMdx(d: Draft): string {
  const fm = [
    "---",
    `title: ${JSON.stringify(d.title)}`,
    `description: ${JSON.stringify(d.summary)}`,
    `date: ${JSON.stringify(d.date)}`,
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

  // 웹 검색으로 조사 후, 구조화 출력으로 초안을 받는다.
  // 서버 도구(web_search)를 쓰므로 스트리밍으로 pause_turn 을 처리한다.
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    thinking: { type: "adaptive" },
    tools: [{ type: "web_search_20260209", name: "web_search" }],
    output_config: {
      format: { type: "json_schema", schema: OUTPUT_SCHEMA },
    },
    messages: [{ role: "user", content: RESEARCH_PROMPT }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    console.error("[monitor] 응답에 텍스트가 없습니다.");
    process.exit(1);
  }

  let draft: Draft;
  try {
    draft = JSON.parse(textBlock.text) as Draft;
  } catch (e) {
    console.error("[monitor] JSON 파싱 실패:", textBlock.text.slice(0, 200));
    process.exit(1);
  }

  if (!draft.hasNews) {
    console.log("[monitor] 새 소식 없음. 초안을 만들지 않습니다.");
    return;
  }

  await mkdir(UPDATES_DIR, { recursive: true });
  const slug = slugify(draft.title, draft.date);
  const file = path.join(UPDATES_DIR, `${slug}.mdx`);
  await writeFile(file, toMdx(draft), "utf8");
  console.log(`[monitor] 초안 생성됨: content/updates/${slug}.mdx`);
}

main().catch((err) => {
  console.error("[monitor] 실행 오류:", err);
  process.exit(1);
});

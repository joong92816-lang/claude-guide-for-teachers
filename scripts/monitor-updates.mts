// scripts/monitor-updates.mts
// 매일 실행: 공식 소스 수집 → 이전 스냅샷과 비교 → 변경 시 초안 파일 생성.
// 완전 자동 게시는 하지 않음 — PR로 만들어 사람 검수를 거친다 (PRD 설계 원칙).
// LLM/API 키가 필요 없다(해시 비교만).
import fs from "node:fs/promises";
import crypto from "node:crypto";

const SOURCES = [
  { id: "docs-map", url: "https://docs.claude.com/en/docs_site_map.md" },
  {
    id: "code-docs-map",
    url: "https://docs.anthropic.com/en/docs/claude-code/claude_code_docs_map.md",
  },
  {
    id: "npm-claude-code",
    url: "https://registry.npmjs.org/@anthropic-ai/claude-code/latest",
  },
];
const SNAP_DIR = ".update-snapshots";

async function main() {
  await fs.mkdir(SNAP_DIR, { recursive: true });
  const changes: string[] = [];

  for (const src of SOURCES) {
    const res = await fetch(src.url);
    if (!res.ok) {
      console.error(`fetch 실패: ${src.id}`);
      continue;
    }
    const body = await res.text();
    const hash = crypto.createHash("sha256").update(body).digest("hex");
    const snapPath = `${SNAP_DIR}/${src.id}.hash`;
    const prev = await fs.readFile(snapPath, "utf8").catch(() => "");
    if (prev && prev !== hash) changes.push(src.id);
    await fs.writeFile(snapPath, hash);
    await fs.writeFile(`${SNAP_DIR}/${src.id}.body`, body); // diff 확인용
  }

  if (changes.length === 0) {
    console.log("변경 없음");
    return;
  }

  // 변경 감지 → 검수용 초안 생성 (내용 요약은 검수자가 클로드 코드로 수행 권장:
  //  "스냅샷 diff를 읽고 교사용 업데이트 노트 초안을 작성해줘")
  const date = new Date().toISOString().slice(0, 10);
  const draft = `---
title: "(검수 필요) ${date} 클로드 업데이트 감지"
date: "${date}"
status: "draft"
---
자동 감지된 변경 소스: ${changes.join(", ")}

> 담당자 검수 단계: .update-snapshots/ 의 diff를 확인하고
> 교사용 언어로 이 초안을 완성한 뒤 status를 published로 바꾸세요.
`;
  await fs.writeFile(`content/updates/${date}-draft.mdx`, draft);
  console.log(`초안 생성: content/updates/${date}-draft.mdx`);
}

main().catch((err) => {
  console.error("[monitor] 실행 오류:", err);
  process.exit(1);
});

// lib/knowledge.ts — /content/guides 폴더의 MDX를 지식 베이스 문자열로.
// 각 항목에 경로(/guides/<slug>)를 포함해, 모델이 답변 끝에 실제 가이드 경로를
// 제안할 수 있게 한다.
import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";

let cache: { text: string; at: number } | null = null;

export async function loadKnowledgeBase(): Promise<string> {
  if (cache && Date.now() - cache.at < 5 * 60_000) return cache.text;
  const dir = path.join(process.cwd(), "content", "guides");
  const files = (await fs.readdir(dir)).filter((f) => f.endsWith(".mdx"));
  const parts: string[] = [];
  for (const f of files) {
    const raw = await fs.readFile(path.join(dir, f), "utf8");
    const { data, content } = matter(raw);
    parts.push(
      `### ${data.title} (경로: /guides/${f.replace(".mdx", "")})\n${content}`,
    );
  }
  const text = parts.join("\n\n---\n\n").slice(0, 60_000); // 컨텍스트 상한
  cache = { text, at: Date.now() };
  return text;
}

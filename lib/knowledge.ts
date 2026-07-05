/**
 * /content 를 지식 베이스 텍스트로 변환.
 *
 * 가이드·튜토리얼·업데이트 MDX 본문을 하나의 텍스트로 합쳐,
 * Q&A API 의 system 프롬프트 뒤에 근거 자료로 붙입니다.
 * 모듈 레벨 캐시로 요청마다 파일을 다시 읽지 않습니다.
 * (내용은 안정적이므로 prompt caching 접두부로도 안전합니다.)
 */
import { getAllDocs, type ContentType } from "./mdx";

let cache: string | null = null;

function sectionFor(type: ContentType, heading: string): string {
  const docs = getAllDocs(type);
  if (docs.length === 0) return "";
  const parts = docs.map((d) => {
    const desc = d.frontmatter.description
      ? `\n> ${d.frontmatter.description}`
      : "";
    return `### ${d.frontmatter.title}${desc}\n\n${d.content.trim()}`;
  });
  return `## ${heading}\n\n${parts.join("\n\n---\n\n")}`;
}

/** 지식 베이스 전체 텍스트를 반환 (캐시됨). */
export function getKnowledgeBase(): string {
  if (cache !== null) return cache;

  const sections = [
    sectionFor("guides", "기능 가이드"),
    sectionFor("tutorials", "튜토리얼"),
    sectionFor("updates", "새 소식"),
  ].filter(Boolean);

  cache =
    "다음은 이 서비스가 제공하는 가이드/튜토리얼/업데이트 내용입니다. " +
    "사용자 질문에 답할 때 이 내용에 근거가 있으면 우선 활용하세요.\n\n" +
    sections.join("\n\n");

  return cache;
}

/** 개발 중 콘텐츠 변경 시 캐시를 비우고 싶을 때 호출. */
export function clearKnowledgeCache(): void {
  cache = null;
}

/**
 * content/ 디렉터리의 MDX 파일을 읽고 파싱하는 서버 전용 헬퍼.
 * (Node 런타임에서만 동작 — 서버 컴포넌트 / 라우트 핸들러에서 사용)
 */
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

export type ContentType = "guides" | "tutorials" | "updates";

export type Frontmatter = {
  title: string;
  description?: string;
  date?: string; // ISO (YYYY-MM-DD)
  order?: number;
  course?: string; // 튜토리얼: 소속 코스 (예: "A")
  tags?: string[];
};

export type ContentDoc = {
  slug: string;
  frontmatter: Frontmatter;
  content: string; // 프론트매터를 제외한 본문(MDX)
};

const CONTENT_DIR = path.join(process.cwd(), "content");

function dirFor(type: ContentType): string {
  return path.join(CONTENT_DIR, type);
}

/** 특정 타입의 모든 슬러그(파일명, 확장자 제외)를 반환. */
export function getSlugs(type: ContentType): string[] {
  const dir = dirFor(type);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".mdx"))
    .map((f) => f.replace(/\.mdx$/, ""));
}

/** 슬러그로 단일 문서를 로드. 없으면 null. */
export function getDoc(type: ContentType, slug: string): ContentDoc | null {
  const file = path.join(dirFor(type), `${slug}.mdx`);
  if (!fs.existsSync(file)) return null;
  const raw = fs.readFileSync(file, "utf8");
  const { data, content } = matter(raw);
  return {
    slug,
    frontmatter: data as Frontmatter,
    content,
  };
}

/** 특정 타입의 모든 문서를 정렬해 반환. */
export function getAllDocs(type: ContentType): ContentDoc[] {
  const docs = getSlugs(type)
    .map((slug) => getDoc(type, slug))
    .filter((d): d is ContentDoc => d !== null);

  return docs.sort((a, b) => {
    // updates 는 날짜 내림차순, 그 외는 order 오름차순 → 제목순.
    if (type === "updates") {
      return (b.frontmatter.date ?? "").localeCompare(a.frontmatter.date ?? "");
    }
    const oa = a.frontmatter.order ?? 999;
    const ob = b.frontmatter.order ?? 999;
    if (oa !== ob) return oa - ob;
    return a.frontmatter.title.localeCompare(b.frontmatter.title);
  });
}

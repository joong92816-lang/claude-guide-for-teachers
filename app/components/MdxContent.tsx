import { compileMDX } from "next-mdx-remote/rsc";

/**
 * MDX 문자열을 서버에서 렌더링 (React Server Component).
 * 프론트매터는 lib/mdx.ts 에서 이미 분리했으므로 여기서는 본문만 처리합니다.
 */
export default async function MdxContent({ source }: { source: string }) {
  const { content } = await compileMDX({
    source,
    options: { parseFrontmatter: false },
  });
  return <div className="prose-basic">{content}</div>;
}

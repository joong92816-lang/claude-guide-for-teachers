import type { Metadata } from "next";
import { getAllDocs } from "@/lib/mdx";
import MdxContent from "@/app/components/MdxContent";

export const metadata: Metadata = {
  title: "새 소식 · 업데이트 노트",
  description: "클로드 코드와 교육 활용 관련 최신 소식 및 업데이트 노트.",
};

/**
 * 새 소식 페이지. content/updates/*.mdx 를 날짜 내림차순으로 나열합니다.
 * (초안은 scripts/monitor-updates.mts 자동 파이프라인이 생성)
 */
export default function UpdatesPage() {
  const updates = getAllDocs("updates");

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">새 소식</h1>
        <p className="mt-2 text-slate-600">
          클로드 코드와 교육 활용에 대한 업데이트를 모았습니다.
        </p>
      </header>

      {updates.length === 0 && (
        <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
          아직 등록된 소식이 없습니다.
        </p>
      )}

      <div className="space-y-8">
        {updates.map((u) => (
          <article
            key={u.slug}
            className="rounded-xl border border-slate-200 bg-white p-6"
          >
            <div className="mb-2 flex items-baseline justify-between gap-3">
              <h2 className="text-xl font-bold text-slate-900">
                {u.frontmatter.title}
              </h2>
              {u.frontmatter.date && (
                <time className="shrink-0 text-sm text-slate-400">
                  {u.frontmatter.date}
                </time>
              )}
            </div>
            <MdxContent source={u.content} />
          </article>
        ))}
      </div>
    </div>
  );
}

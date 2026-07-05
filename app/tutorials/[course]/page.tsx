import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getDoc, getSlugs, getAllDocs } from "@/lib/mdx";
import MdxContent from "@/app/components/MdxContent";
import ProgressTracker from "@/app/components/ProgressTracker";

/**
 * 튜토리얼 단계 페이지.
 * 폴더명은 [course] 이지만 실제로는 튜토리얼 파일의 슬러그를 받습니다.
 * (사이드바가 /tutorials/{slug} 로 링크) 같은 course 프론트매터를 가진
 * 단계들을 묶어 진도 바를 구성합니다.
 */
export function generateStaticParams() {
  return getSlugs("tutorials").map((slug) => ({ course: slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ course: string }>;
}): Promise<Metadata> {
  const { course } = await params;
  const doc = getDoc("tutorials", course);
  return {
    title: doc ? `${doc.frontmatter.title} · 튜토리얼` : "튜토리얼",
    description: doc?.frontmatter.description,
  };
}

export default async function TutorialPage({
  params,
}: {
  params: Promise<{ course: string }>;
}) {
  const { course: slug } = await params;
  const doc = getDoc("tutorials", slug);
  if (!doc) notFound();

  // 같은 코스에 속한 단계들을 순서대로 모아 진도 바에 전달.
  const courseName = doc.frontmatter.course ?? "기타";
  const steps = getAllDocs("tutorials")
    .filter((d) => (d.frontmatter.course ?? "기타") === courseName)
    .map((d) => ({ slug: d.slug, title: d.frontmatter.title }));

  return (
    <article className="mx-auto max-w-3xl">
      <header className="mb-6 border-b border-slate-200 pb-4">
        <p className="text-sm font-semibold text-brand-600">
          튜토리얼 · 코스 {courseName}
        </p>
        <h1 className="mt-1 text-3xl font-bold text-slate-900">
          {doc.frontmatter.title}
        </h1>
        {doc.frontmatter.description && (
          <p className="mt-2 text-slate-600">{doc.frontmatter.description}</p>
        )}
      </header>

      <MdxContent source={doc.content} />

      <ProgressTracker slug={slug} steps={steps} />
    </article>
  );
}

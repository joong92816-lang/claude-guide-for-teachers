import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getDoc, getSlugs } from "@/lib/mdx";
import MdxContent from "@/app/components/MdxContent";

/** 빌드 시 모든 가이드 슬러그를 정적 생성. */
export function generateStaticParams() {
  return getSlugs("guides").map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const doc = getDoc("guides", slug);
  return {
    title: doc ? `${doc.frontmatter.title} · 가이드` : "가이드",
    description: doc?.frontmatter.description,
  };
}

export default async function GuidePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const doc = getDoc("guides", slug);
  if (!doc) notFound();

  return (
    <article className="mx-auto max-w-3xl">
      <header className="mb-6 border-b border-slate-200 pb-4">
        <p className="text-sm font-semibold text-brand-600">기능 가이드</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-900">
          {doc.frontmatter.title}
        </h1>
        {doc.frontmatter.description && (
          <p className="mt-2 text-slate-600">{doc.frontmatter.description}</p>
        )}
      </header>
      <MdxContent source={doc.content} />
    </article>
  );
}

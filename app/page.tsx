import Link from "next/link";
import AskBox from "./components/AskBox";
import { getAllDocs } from "@/lib/mdx";

/** 예시 질문 칩 — 클릭하면 /chat 으로 바로 질문 전송. */
const EXAMPLES = [
  "학부모 상담 안내문 초안을 만들어 줘",
  "중2 수학 수행평가 채점 기준표를 만들어 줘",
  "학급 규칙을 학생들과 함께 정하는 활동을 설계해 줘",
  "클로드 코드를 처음 쓰는데 무엇부터 시작하면 좋을까?",
];

export default function HomePage() {
  const guides = getAllDocs("guides");

  return (
    <div className="mx-auto max-w-3xl">
      <section className="py-8 text-center">
        <h1 className="text-3xl font-bold text-slate-900">
          무엇을 도와드릴까요?
        </h1>
        <p className="mt-2 text-slate-600">
          수업 준비·행정·평가·학생 지도에 AI를 쉽게 활용하도록 도와드려요.
        </p>
      </section>

      <AskBox />

      <div className="mt-4 flex flex-wrap gap-2">
        {EXAMPLES.map((ex) => (
          <Link
            key={ex}
            href={`/chat?q=${encodeURIComponent(ex)}`}
            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 transition hover:border-brand-300 hover:text-brand-700"
          >
            {ex}
          </Link>
        ))}
      </div>

      <section className="mt-12">
        <h2 className="mb-4 text-lg font-bold text-slate-900">기능 가이드</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {guides.map((g) => (
            <Link
              key={g.slug}
              href={`/guides/${g.slug}`}
              className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-brand-300 hover:shadow-sm"
            >
              <h3 className="font-semibold text-slate-900">
                {g.frontmatter.title}
              </h3>
              {g.frontmatter.description && (
                <p className="mt-1 text-sm text-slate-500">
                  {g.frontmatter.description}
                </p>
              )}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

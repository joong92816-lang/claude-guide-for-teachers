import Link from "next/link";
import { getAllDocs } from "@/lib/mdx";

/**
 * 좌측 사이드바 (서버 컴포넌트).
 * content/ 에서 가이드·튜토리얼 목록을 읽어 네비게이션을 구성합니다.
 */
export default function Sidebar() {
  const guides = getAllDocs("guides");
  const tutorials = getAllDocs("tutorials");

  // 튜토리얼은 course 프론트매터로 묶어 코스별로 표시.
  const courses = new Map<string, typeof tutorials>();
  for (const t of tutorials) {
    const c = t.frontmatter.course ?? "기타";
    if (!courses.has(c)) courses.set(c, []);
    courses.get(c)!.push(t);
  }

  return (
    <nav
      className="hidden w-64 shrink-0 border-r border-slate-200 bg-white p-4 md:block"
      aria-label="사이드바"
    >
      <div className="space-y-6 text-sm">
        <div>
          <Link
            href="/chat"
            className="block rounded-lg bg-brand-50 px-3 py-2 font-semibold text-brand-700 hover:bg-brand-100"
          >
            💬 질문하기 (Q&amp;A)
          </Link>
        </div>

        <Section title="기능 가이드">
          {guides.map((g) => (
            <NavLink key={g.slug} href={`/guides/${g.slug}`}>
              {g.frontmatter.title}
            </NavLink>
          ))}
        </Section>

        {[...courses.entries()].map(([course, items]) => (
          <Section key={course} title={`튜토리얼 · 코스 ${course}`}>
            {items.map((t) => (
              <NavLink key={t.slug} href={`/tutorials/${t.slug}`}>
                {t.frontmatter.title}
              </NavLink>
            ))}
          </Section>
        ))}

        <Section title="소식">
          <NavLink href="/updates">🆕 새 소식 / 업데이트 노트</NavLink>
        </Section>
      </div>
    </nav>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
        {title}
      </h2>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="block rounded-md px-3 py-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
    >
      {children}
    </Link>
  );
}

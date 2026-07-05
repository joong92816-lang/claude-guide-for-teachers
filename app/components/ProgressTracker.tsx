"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Step = { slug: string; title: string };

const STORAGE_KEY = "tutorial-progress";

/**
 * 튜토리얼 진도 표시 + 완료 토글. 완료한 단계 슬러그를 localStorage 에 저장합니다.
 * 같은 코스의 단계 목록(steps)을 받아 진행률 바와 이전/다음 이동을 제공합니다.
 */
export default function ProgressTracker({
  slug,
  steps,
}: {
  slug: string;
  steps: Step[];
}) {
  const [completed, setCompleted] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setCompleted(new Set(JSON.parse(raw)));
    } catch {
      /* 무시 */
    }
  }, []);

  function persist(next: Set<string>) {
    setCompleted(new Set(next));
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
  }

  function toggle() {
    const next = new Set(completed);
    if (next.has(slug)) next.delete(slug);
    else next.add(slug);
    persist(next);
  }

  const idx = steps.findIndex((s) => s.slug === slug);
  const prev = idx > 0 ? steps[idx - 1] : null;
  const next = idx < steps.length - 1 ? steps[idx + 1] : null;
  const doneCount = steps.filter((s) => completed.has(s.slug)).length;
  const pct = steps.length ? Math.round((doneCount / steps.length) * 100) : 0;
  const isDone = completed.has(slug);

  return (
    <div className="my-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-semibold text-slate-700">
          코스 진행률 {doneCount}/{steps.length}
        </span>
        <span className="text-slate-500">{pct}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full bg-brand-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>

      <button
        onClick={toggle}
        className={`mt-4 w-full rounded-lg px-4 py-2 text-sm font-semibold transition ${
          isDone
            ? "bg-emerald-500 text-white hover:bg-emerald-600"
            : "bg-brand-500 text-white hover:bg-brand-600"
        }`}
      >
        {isDone ? "✓ 완료함 (취소하려면 클릭)" : "이 단계 완료로 표시"}
      </button>

      <div className="mt-3 flex justify-between text-sm">
        {prev ? (
          <Link
            href={`/tutorials/${prev.slug}`}
            className="text-brand-600 hover:underline"
          >
            ← {prev.title}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link
            href={`/tutorials/${next.slug}`}
            className="text-brand-600 hover:underline"
          >
            {next.title} →
          </Link>
        ) : (
          <span />
        )}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";

/**
 * 폰트 크기 조절 (접근성).
 * html[data-font-size] 를 바꾸면 globals.css 의 규칙에 따라 기준 폰트가 바뀝니다.
 * 선택값은 localStorage 에 저장되어 다음 방문에도 유지됩니다.
 */
const SIZES = [
  { key: "sm", label: "작게" },
  { key: "base", label: "보통" },
  { key: "lg", label: "크게" },
  { key: "xl", label: "아주 크게" },
] as const;

type SizeKey = (typeof SIZES)[number]["key"];

const STORAGE_KEY = "font-size";

export default function FontSizeControl() {
  const [size, setSize] = useState<SizeKey>("base");

  useEffect(() => {
    const saved = (localStorage.getItem(STORAGE_KEY) as SizeKey) || "base";
    setSize(saved);
    document.documentElement.dataset.fontSize = saved;
  }, []);

  function apply(next: SizeKey) {
    setSize(next);
    document.documentElement.dataset.fontSize = next;
    localStorage.setItem(STORAGE_KEY, next);
  }

  return (
    <div
      className="flex items-center gap-1"
      role="group"
      aria-label="글자 크기 조절"
    >
      <span className="mr-1 text-xs text-slate-500">글자 크기</span>
      {SIZES.map((s) => (
        <button
          key={s.key}
          type="button"
          onClick={() => apply(s.key)}
          aria-pressed={size === s.key}
          className={`rounded px-2 py-1 text-xs transition ${
            size === s.key
              ? "bg-brand-500 text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * 홈의 질문 입력창. 제출하면 /chat?q=... 로 이동해 자동으로 질문이 전송됩니다.
 */
export default function AskBox() {
  const router = useRouter();
  const [value, setValue] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = value.trim();
    if (!q) return;
    router.push(`/chat?q=${encodeURIComponent(q)}`);
  }

  return (
    <form onSubmit={submit} className="w-full">
      <div className="flex items-stretch gap-2 rounded-2xl border border-slate-300 bg-white p-2 shadow-sm focus-within:border-brand-400">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="예) 학부모 상담 안내문 초안을 만들어 줘"
          aria-label="질문 입력"
          className="flex-1 rounded-xl bg-transparent px-3 py-2 outline-none"
        />
        <button
          type="submit"
          className="rounded-xl bg-brand-500 px-5 py-2 font-semibold text-white transition hover:bg-brand-600 disabled:opacity-50"
          disabled={!value.trim()}
        >
          질문하기
        </button>
      </div>
    </form>
  );
}

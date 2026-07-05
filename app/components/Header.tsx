import Link from "next/link";
import FontSizeControl from "./FontSizeControl";

/** 공통 헤더: 로고/제목 + 폰트 크기 조절. */
export default function Header() {
  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="flex items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl" aria-hidden>
            📘
          </span>
          <span className="font-bold text-slate-900">
            선생님을 위한 클로드 코드 가이드
          </span>
        </Link>
        <FontSizeControl />
      </div>
    </header>
  );
}

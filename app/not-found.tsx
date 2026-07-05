import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg py-20 text-center">
      <p className="text-5xl">🤔</p>
      <h1 className="mt-4 text-2xl font-bold text-slate-900">
        페이지를 찾을 수 없어요
      </h1>
      <p className="mt-2 text-slate-600">
        주소가 바뀌었거나 삭제된 내용일 수 있습니다.
      </p>
      <Link
        href="/"
        className="mt-6 inline-block rounded-xl bg-brand-500 px-5 py-2 font-semibold text-white hover:bg-brand-600"
      >
        홈으로 가기
      </Link>
    </div>
  );
}

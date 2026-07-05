import ChatClient from "./ChatClient";

/**
 * Q&A 챗 화면. ?q= 쿼리로 넘어온 질문이 있으면 자동으로 전송합니다.
 * (홈 질문창 / 예시 칩에서 이 경로로 넘어옵니다.)
 */
export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const sp = await searchParams;
  const initial = typeof sp.q === "string" ? sp.q : "";
  return <ChatClient initialQuestion={initial} />;
}

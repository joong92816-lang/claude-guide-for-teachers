"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Message = { role: "user" | "assistant"; content: string; blocked?: boolean };

const SUGGESTIONS = [
  "학부모 상담 안내문 초안을 만들어 줘",
  "수행평가 채점 기준표를 만들어 줘",
  "학급 규칙 정하기 활동을 설계해 줘",
];

export default function ChatClient({
  initialQuestion,
}: {
  initialQuestion: string;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [halted, setHalted] = useState(false); // 가드레일 발동 시 잠시 정지
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentInitial = useRef(false);

  const send = useCallback(
    async (text: string) => {
      const question = text.trim();
      if (!question || loading || halted) return;

      const nextMessages: Message[] = [
        ...messages,
        { role: "user", content: question },
      ];
      setMessages(nextMessages);
      setInput("");
      setLoading(true);

      // assistant 자리 표시자 추가 후 스트림으로 채움.
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: nextMessages }),
        });

        // JSON 응답(가드레일 차단 {blocked,warning} / 오류 {error})은 스트림이 아님.
        const contentType = res.headers.get("content-type") ?? "";
        if (contentType.includes("application/json")) {
          const body = await res.json().catch(() => null);
          const msg = body?.warning ?? body?.error ?? "요청을 처리하지 못했습니다.";
          const blocked = Boolean(body?.blocked);
          updateLastAssistant(setMessages, { content: msg, blocked });
          // 가드레일 차단이면 확인 버튼 누르기 전까지 입력 비활성화.
          if (blocked) setHalted(true);
          return;
        }

        if (!res.body) {
          updateLastAssistant(setMessages, {
            content: "응답을 받지 못했습니다.",
          });
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          appendToLastAssistant(setMessages, decoder.decode(value));
        }
      } catch (err) {
        console.error(err);
        appendToLastAssistant(setMessages, "\n\n⚠️ 네트워크 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    },
    [messages, loading, halted],
  );

  // ?q= 로 넘어온 초기 질문 자동 전송 (한 번만).
  useEffect(() => {
    if (initialQuestion && !sentInitial.current) {
      sentInitial.current = true;
      void send(initialQuestion);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuestion]);

  // 새 메시지가 오면 하단으로 스크롤.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, halted]);

  const empty = messages.length === 0;

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-3xl flex-col">
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto py-4">
        {empty && (
          <div className="mt-10 text-center text-slate-500">
            <p className="text-lg font-semibold text-slate-700">
              무엇이든 물어보세요
            </p>
            <p className="mt-1 text-sm">
              수업·행정·평가·학생 지도 관련 질문을 편하게 입력하세요.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => void send(s)}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 hover:border-brand-300 hover:text-brand-700"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <MessageBubble
            key={i}
            message={m}
            loading={loading}
            last={i === messages.length - 1}
          />
        ))}
      </div>

      {halted ? (
        // 가드레일 정지 상태: 확인 전까지 입력 대신 안내 표시.
        <div
          role="alert"
          className="mb-3 rounded-lg border-2 border-amber-500 bg-amber-50 p-4"
        >
          <p className="font-semibold text-amber-900">
            ⚠️ 정책 위반 가능성으로 작동을 멈췄습니다.
          </p>
          <p className="mt-1 text-sm text-amber-800">
            위 안내를 확인하신 뒤 다른 질문으로 이어가실 수 있어요.
          </p>
          <button
            onClick={() => setHalted(false)}
            className="mt-3 rounded bg-amber-600 px-4 py-2 font-semibold text-white hover:bg-amber-700"
          >
            확인했습니다
          </button>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
          className="border-t border-slate-200 bg-slate-50 py-3"
        >
          <div className="flex items-stretch gap-2 rounded-2xl border border-slate-300 bg-white p-2 focus-within:border-brand-400">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="질문을 입력하세요…"
              aria-label="질문 입력"
              className="flex-1 rounded-xl bg-transparent px-3 py-2 outline-none"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="rounded-xl bg-brand-500 px-5 py-2 font-semibold text-white transition hover:bg-brand-600 disabled:opacity-50"
            >
              {loading ? "답변 중…" : "보내기"}
            </button>
          </div>
          <p className="mt-2 text-center text-xs text-slate-400">
            답변은 AI가 생성하며 정확하지 않을 수 있습니다. 학생 개인정보는 입력하지 마세요.
          </p>
        </form>
      )}
    </div>
  );
}

function MessageBubble({
  message,
  loading,
  last,
}: {
  message: Message;
  loading: boolean;
  last: boolean;
}) {
  const isUser = message.role === "user";
  const showCursor = !isUser && last && loading && message.content === "";

  // 가드레일 차단 말풍선은 경고 스타일.
  const bubbleClass = isUser
    ? "bg-brand-500 text-white"
    : message.blocked
      ? "border-2 border-amber-500 bg-amber-50 text-amber-900"
      : "border border-slate-200 bg-white text-slate-800";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 leading-relaxed ${bubbleClass}`}
      >
        {showCursor ? (
          <span className="text-slate-400">생각 중…</span>
        ) : (
          message.content
        )}
      </div>
    </div>
  );
}

/** 마지막 assistant 메시지에 스트림 조각을 이어붙임. */
function appendToLastAssistant(
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
  chunk: string,
) {
  setMessages((prev) => {
    const copy = [...prev];
    for (let i = copy.length - 1; i >= 0; i--) {
      if (copy[i].role === "assistant") {
        copy[i] = { ...copy[i], content: copy[i].content + chunk };
        break;
      }
    }
    return copy;
  });
}

/** 마지막 assistant 메시지를 부분 갱신(내용 교체·blocked 표시 등). */
function updateLastAssistant(
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
  patch: Partial<Message>,
) {
  setMessages((prev) => {
    const copy = [...prev];
    for (let i = copy.length - 1; i >= 0; i--) {
      if (copy[i].role === "assistant") {
        copy[i] = { ...copy[i], ...patch };
        break;
      }
    }
    return copy;
  });
}

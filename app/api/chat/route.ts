/**
 * Q&A API — 스트리밍 + 가드레일 (Google Gemini 백엔드).
 *
 * 흐름:
 *   1) IP별 속도 제한 (rate-limit.ts)
 *   2) 마지막 사용자 메시지에 대한 정책 사전 필터 (guardrail.ts)
 *      → 위반 시 모델을 호출하지 않고 경고 문구를 스트리밍으로 반환
 *   3) 통과 시 Google Gemini(무료 티어)에 스트리밍 요청
 *      systemInstruction = [교사용 지침 + /content 지식 베이스]
 *
 * 응답은 text/plain 토큰 스트림입니다. 클라이언트는 ReadableStream 으로 읽습니다.
 *
 * 환경변수:
 *   GEMINI_API_KEY  (필수)  — https://aistudio.google.com 에서 무료 발급
 *   GEMINI_MODEL    (선택)  — 기본값 gemini-2.5-flash
 */
import { GoogleGenAI } from "@google/genai";
import { SYSTEM_PROMPT } from "@/lib/system-prompt";
import { getKnowledgeBase } from "@/lib/knowledge";
import { checkGuardrail } from "@/lib/guardrail";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

// fs 접근(knowledge.ts)이 필요하므로 Node 런타임 사용.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

type ChatMessage = { role: "user" | "assistant"; content: string };

const encoder = new TextEncoder();

/** 단일 텍스트를 즉시 스트림으로 감싸 반환 (가드레일/에러용). */
function textStream(text: string, status = 200): Response {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(text));
      controller.close();
    },
  });
  return new Response(stream, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

export async function POST(req: Request): Promise<Response> {
  // 1) 속도 제한
  const ip = getClientIp(req);
  const rl = rateLimit(ip);
  if (!rl.ok) {
    return new Response(
      JSON.stringify({
        error: "rate_limited",
        message: `요청이 너무 잦습니다. ${rl.retryAfterSec}초 후 다시 시도해 주세요.`,
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Retry-After": String(rl.retryAfterSec),
        },
      },
    );
  }

  // 요청 파싱
  let messages: ChatMessage[];
  try {
    const body = await req.json();
    messages = Array.isArray(body?.messages) ? body.messages : [];
  } catch {
    return textStream("요청 형식이 올바르지 않습니다.", 400);
  }

  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  if (!lastUser) {
    return textStream("질문 내용을 입력해 주세요.", 400);
  }

  // 2) 가드레일 (정책 사전 필터)
  const gr = checkGuardrail(lastUser.content);
  if (!gr.ok) {
    return textStream(gr.message);
  }

  // API 키 확인 (가드레일 이후 · 모델 호출 직전)
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return textStream(
      "서버에 GEMINI_API_KEY 가 설정되지 않았습니다. 배포 환경변수에 무료 Gemini API 키를 등록해 주세요.",
    );
  }

  // 3) 모델 스트리밍 호출
  const knowledge = getKnowledgeBase();
  const ai = new GoogleGenAI({ apiKey });

  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const stream = await ai.models.generateContentStream({
          model: MODEL,
          contents: messages.map((m) => ({
            // Gemini 는 assistant 역할을 "model" 로 표기.
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: m.content }],
          })),
          config: {
            systemInstruction: `${SYSTEM_PROMPT}\n\n${knowledge}`,
            maxOutputTokens: 2048,
          },
        });

        for await (const chunk of stream) {
          const text = chunk.text;
          if (text) controller.enqueue(encoder.encode(text));
        }
      } catch (err) {
        console.error("[api/chat] stream error", err);
        controller.enqueue(
          encoder.encode(
            "\n\n⚠️ 답변 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
          ),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-RateLimit-Remaining": String(rl.remaining),
    },
  });
}

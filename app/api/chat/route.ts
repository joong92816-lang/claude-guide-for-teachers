/**
 * Q&A API — 스트리밍 + 가드레일.
 *
 * 흐름:
 *   1) IP별 속도 제한 (rate-limit.ts)
 *   2) 마지막 사용자 메시지에 대한 정책 사전 필터 (guardrail.ts)
 *      → 위반 시 모델을 호출하지 않고 경고 문구를 스트리밍으로 반환
 *   3) 통과 시 Claude Opus 4.8 에 스트리밍 요청 (adaptive thinking)
 *      system = [교사용 지침 + /content 지식 베이스] (둘 다 prompt caching)
 *
 * 응답은 text/plain 토큰 스트림입니다. 클라이언트는 ReadableStream 으로 읽습니다.
 */
import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT } from "@/lib/system-prompt";
import { getKnowledgeBase } from "@/lib/knowledge";
import { checkGuardrail } from "@/lib/guardrail";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

// fs 접근(knowledge.ts)이 필요하므로 Node 런타임 사용.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = "claude-opus-4-8";

type ChatMessage = { role: "user" | "assistant"; content: string };

// ANTHROPIC_API_KEY 는 환경변수에서 자동으로 읽힘.
const client = new Anthropic();

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

  // 3) 모델 스트리밍 호출
  const knowledge = getKnowledgeBase();

  const anthropicStream = client.messages.stream({
    model: MODEL,
    max_tokens: 4096,
    thinking: { type: "adaptive" },
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
      {
        type: "text",
        text: knowledge,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  });

  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of anthropicStream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
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
    cancel() {
      anthropicStream.abort();
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

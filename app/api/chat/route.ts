// app/api/chat/route.ts
// 백엔드는 무료 Google Gemini (직전 결정). 구조/흐름은 제공된 설계를 따름:
//   ① 속도 제한 → ② 가드레일(위반 시 API 호출 없이 경고) → ③ 스트리밍 응답
import { GoogleGenAI } from "@google/genai";
import { checkGuardrail } from "@/lib/guardrail";
import { buildSystemPrompt } from "@/lib/system-prompt";
import { loadKnowledgeBase } from "@/lib/knowledge";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

export async function POST(req: Request) {
  // ① 속도 제한 (키 오남용 방지)
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  if (!rateLimit(ip)) {
    return Response.json(
      { error: "요청이 너무 잦습니다. 잠시 후 다시 시도해 주세요." },
      { status: 429 },
    );
  }

  let messages: { role: "user" | "assistant"; content: string }[];
  try {
    ({ messages } = (await req.json()) as {
      messages: { role: "user" | "assistant"; content: string }[];
    });
  } catch {
    return Response.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }
  if (!Array.isArray(messages)) messages = [];

  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  if (!lastUser) {
    return Response.json({ error: "질문이 비어 있습니다." }, { status: 400 });
  }

  // ② 안전 가드레일: 위반 소지 감지 시 API 호출 없이 경고 후 중단
  const guard = checkGuardrail(lastUser.content);
  if (!guard.allowed) {
    return Response.json({ blocked: true, warning: guard.warning });
  }

  // 키 확인 (가드레일 이후 · 모델 호출 직전)
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json(
      {
        error:
          "서버에 GEMINI_API_KEY 가 설정되지 않았습니다. 배포 환경변수에 무료 Gemini 키를 등록해 주세요.",
      },
      { status: 500 },
    );
  }

  // ③ 정상 요청: 스트리밍 응답
  const system = buildSystemPrompt(await loadKnowledgeBase());
  const ai = new GoogleGenAI({ apiKey });

  const encoder = new TextEncoder();
  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const stream = await ai.models.generateContentStream({
          model: MODEL,
          // 최근 10턴만 전달해 비용 관리. Gemini 는 assistant 를 "model" 로 표기.
          contents: messages.slice(-10).map((m) => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: m.content }],
          })),
          config: { systemInstruction: system, maxOutputTokens: 1500 },
        });
        for await (const chunk of stream) {
          const text = chunk.text;
          if (text) controller.enqueue(encoder.encode(text));
        }
      } catch (err) {
        console.error("[api/chat] stream error", err);
        controller.enqueue(
          encoder.encode("\n\n(연결 오류가 발생했어요. 다시 시도해 주세요.)"),
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
    },
  });
}

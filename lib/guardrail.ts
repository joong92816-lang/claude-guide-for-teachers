/**
 * 정책 위반 사전 필터.
 *
 * 모델을 호출하기 *전에* 사용자 입력을 검사해, 명백한 정책 위반은
 * 토큰을 소비하지 않고 즉시 경고로 차단합니다. (1차 방어선)
 * 미묘한 사례는 system-prompt.ts 의 안전 규칙이 2차로 처리합니다.
 *
 * 목적은 완벽한 필터가 아니라 "명백한 오남용을 값싸게 거르는 것" 입니다.
 * 규칙은 보수적으로 유지하고, 오탐(false positive)을 줄이기 위해 강한 신호만 사용합니다.
 */

export type GuardrailResult =
  | { ok: true }
  | { ok: false; reason: string; message: string };

/** 명백히 도와서는 안 되는 요청 패턴 (강한 신호). */
const BLOCK_PATTERNS: { re: RegExp; reason: string; message: string }[] = [
  {
    re: /(시험|평가)\s*(정답|답안)[^\n]{0,20}(만들|생성|작성|대신)/,
    reason: "academic-dishonesty",
    message:
      "시험 답안을 대신 만들어 드릴 수는 없어요. 대신 채점 기준표나 피드백 문구를 함께 설계해 드릴 수 있습니다. 무엇을 도와드릴까요?",
  },
  {
    re: /(주민\s*등록\s*번호|주민번호)/,
    reason: "pii-rrn",
    message:
      "학생의 주민등록번호 같은 민감정보는 입력하지 않으시길 권해요. 대신 학생을 '학생1, 학생2'처럼 익명으로 표기하면 안전하게 도와드릴 수 있습니다.",
  },
  {
    re: /(자살|자해)[^\n]{0,15}(방법|하는\s*법)/,
    reason: "self-harm",
    message:
      "이 주제는 제가 다루기 어렵습니다. 위급하다면 학생과 함께 즉시 학교 상담 선생님 또는 자살예방상담전화(☎ 109)로 연결해 주세요.",
  },
];

/** PII 로 의심되는 실명+연락처 조합 (약한 신호 → 차단이 아니라 주의 안내). */
const CAUTION_PHONE = /01[016789][-\s]?\d{3,4}[-\s]?\d{4}/;

export function checkGuardrail(userText: string): GuardrailResult {
  const text = (userText ?? "").trim();
  if (!text) {
    return {
      ok: false,
      reason: "empty",
      message: "질문 내용을 입력해 주세요.",
    };
  }

  for (const rule of BLOCK_PATTERNS) {
    if (rule.re.test(text)) {
      return { ok: false, reason: rule.reason, message: rule.message };
    }
  }

  if (CAUTION_PHONE.test(text)) {
    return {
      ok: false,
      reason: "pii-phone",
      message:
        "전화번호처럼 보이는 개인정보가 포함되어 있어요. 개인정보를 지우고 다시 질문해 주시면 안전하게 도와드리겠습니다.",
    };
  }

  return { ok: true };
}

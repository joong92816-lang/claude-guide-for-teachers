// lib/guardrail.ts
// 1차 방어선: 명백한 위반 소지 요청을 API 호출 전에 차단.
// 2차 방어선은 system-prompt.ts 의 모델 지침 (미묘한 경우 모델이 판단해 중단).
//
// 규칙은 두 종류:
//   - reason  : Anthropic 이용 정책 위반 소지 → 표준 AUP 경고문
//   - warning : 성격이 다른 상황(자해 위기, 개인정보 주의)용 전용 메시지

export type GuardrailResult =
  | { allowed: true }
  | { allowed: false; warning: string };

/** AUP 위반 소지 규칙의 표준 경고문. */
function aupWarning(reason: string): string {
  return [
    "⚠️ 요청을 진행할 수 없어 작동을 멈췄습니다.",
    "",
    `사유: ${reason}은(는) Anthropic 이용 정책 위반 가능성이 있습니다.`,
    "",
    "이 서비스는 클로드와 클로드 코드의 올바른 활용을 돕기 위한 것입니다.",
    "정책 안내: https://www.anthropic.com/legal/aup",
    "질문 의도가 다르다면, 목적을 구체적으로 다시 적어 주세요.",
  ].join("\n");
}

type BlockRule =
  | { pattern: RegExp; reason: string } // → aupWarning(reason)
  | { pattern: RegExp; warning: string }; // → 전용 메시지

const BLOCK_RULES: BlockRule[] = [
  // 자해/위기 — AUP 위반이 아니라 '위기 지원' 상황이므로 전용 안내. (최우선)
  {
    pattern: /(자살|자해)[^\n]{0,15}(방법|하는\s*법)/,
    warning: [
      "⚠️ 이 주제는 제가 다루기 어렵습니다.",
      "",
      "지금 도움이 필요한 학생이 있다면, 즉시 학교 상담 선생님 또는 아래로 연결해 주세요.",
      "· 자살예방상담전화 ☎ 109 (24시간)",
      "· 청소년전화 ☎ 1388",
    ].join("\n"),
  },
  {
    pattern:
      /(주민등록번호|주민번호|학생.{0,10}(전화번호|주소|연락처).{0,10}(수집|모아|정리))/,
    reason: "학생 등 개인의 민감한 개인정보를 수집·정리하는 요청",
  },
  {
    pattern: /(해킹|크랙|비밀번호\s*(뚫|우회|알아내)|디도스|악성\s*코드|랜섬웨어)/,
    reason: "시스템 침해나 악성 코드와 관련된 요청",
  },
  {
    pattern: /(시험\s*(문제|답).{0,10}(유출|미리)|성적\s*조작|대리\s*(시험|과제))/,
    reason: "평가의 공정성을 해치는 요청",
  },
  {
    pattern: /(교과서|문제집|기출).{0,15}(통째로|전체|전부).{0,10}(복사|옮겨|추출)/,
    reason: "저작물을 통째로 복제하는 요청",
  },
  // 단독 전화번호 — 소프트 감지. 익명화 권유 (가장 마지막, 약한 신호).
  {
    pattern: /01[016789][-\s]?\d{3,4}[-\s]?\d{4}/,
    warning: [
      "⚠️ 전화번호처럼 보이는 개인정보가 포함되어 있어요.",
      "",
      "개인정보를 지우거나 '학생1'처럼 익명으로 바꾼 뒤 다시 질문해 주시면 안전하게 도와드리겠습니다.",
    ].join("\n"),
  },
];

export function checkGuardrail(userMessage: string): GuardrailResult {
  for (const rule of BLOCK_RULES) {
    if (rule.pattern.test(userMessage)) {
      const warning =
        "warning" in rule ? rule.warning : aupWarning(rule.reason);
      return { allowed: false, warning };
    }
  }
  return { allowed: true };
}

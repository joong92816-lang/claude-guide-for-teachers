// lib/rate-limit.ts — 간단한 메모리 기반 제한 (분당 10회/IP)
const hits = new Map<string, number[]>();

export function rateLimit(key: string, limit = 10, windowMs = 60_000): boolean {
  const now = Date.now();
  const arr = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (arr.length >= limit) return false;
  arr.push(now);
  hits.set(key, arr);
  return true;
}
// 참고: 서버리스 다중 인스턴스 환경에서는 Upstash Redis 등으로 교체 권장.

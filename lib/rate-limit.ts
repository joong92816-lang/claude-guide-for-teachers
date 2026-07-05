/**
 * IP별 속도 제한 (고정 윈도우, 인메모리).
 *
 * ⚠️ 한계: 이 구현은 단일 프로세스 메모리에 상태를 둡니다.
 *   - 서버리스/멀티 인스턴스 환경에서는 인스턴스마다 카운터가 따로 생깁니다.
 *   - 프로덕션에서 엄격한 제한이 필요하면 Redis/Upstash 등 공유 저장소로 교체하세요.
 * 이 스캐폴드에서는 남용 방지를 위한 "최소한의 방어" 용도로 충분합니다.
 */

type Bucket = { count: number; resetAt: number };

const WINDOW_MS = 60_000; // 1분
const MAX_REQUESTS = 15; // 분당 15회

const buckets = new Map<string, Bucket>();

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  resetAt: number;
  retryAfterSec: number;
};

export function rateLimit(ip: string): RateLimitResult {
  const now = Date.now();
  const key = ip || "unknown";
  let bucket = buckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    bucket = { count: 0, resetAt: now + WINDOW_MS };
    buckets.set(key, bucket);
  }

  bucket.count += 1;
  const ok = bucket.count <= MAX_REQUESTS;

  // 메모리 누수 방지: 가끔 만료된 버킷 정리.
  if (buckets.size > 10_000) {
    for (const [k, v] of buckets) {
      if (now >= v.resetAt) buckets.delete(k);
    }
  }

  return {
    ok,
    remaining: Math.max(0, MAX_REQUESTS - bucket.count),
    resetAt: bucket.resetAt,
    retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000),
  };
}

/** 요청 헤더에서 클라이언트 IP를 추출 (프록시 뒤를 고려). */
export function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

import crypto from 'node:crypto'

/** In-memory sliding-window rate limiter (per server process). */
export function createRateLimiter({ windowMs, max }: { windowMs: number; max: number }) {
  const hits = new Map<string, number[]>()
  return {
    check(key: string): boolean {
      const now = Date.now()
      const arr = (hits.get(key) ?? []).filter((t) => now - t < windowMs)
      if (arr.length >= max) {
        hits.set(key, arr)
        return false
      }
      arr.push(now)
      hits.set(key, arr)
      // Opportunistic cleanup so the map can't grow unbounded.
      if (hits.size > 5000) {
        for (const [k, v] of hits) if (v.every((t) => now - t >= windowMs)) hits.delete(k)
      }
      return true
    },
  }
}

/** Hash the client IP (from common proxy headers) with the configured salt. */
export function hashIp(headers: Headers, salt: string): string {
  const fwd = headers.get('x-forwarded-for') ?? ''
  const ip = (fwd.split(',')[0] || headers.get('x-real-ip') || 'unknown').trim()
  return crypto.createHash('sha256').update(`${salt}:${ip}`).digest('hex').slice(0, 32)
}

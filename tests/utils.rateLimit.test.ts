import { describe, it, expect, vi, afterEach } from 'vitest'
import { createRateLimiter, hashIp } from '../src/utils/rateLimit.js'

describe('createRateLimiter', () => {
  afterEach(() => vi.useRealTimers())

  it('allows up to max in the window then blocks', () => {
    const limiter = createRateLimiter({ windowMs: 1000, max: 2 })
    expect(limiter.check('k')).toBe(true)
    expect(limiter.check('k')).toBe(true)
    expect(limiter.check('k')).toBe(false)
  })

  it('tracks keys independently', () => {
    const limiter = createRateLimiter({ windowMs: 1000, max: 1 })
    expect(limiter.check('a')).toBe(true)
    expect(limiter.check('b')).toBe(true)
    expect(limiter.check('a')).toBe(false)
  })

  it('resets after the window elapses', () => {
    vi.useFakeTimers()
    vi.setSystemTime(1000)
    const limiter = createRateLimiter({ windowMs: 1000, max: 1 })
    expect(limiter.check('k')).toBe(true)
    expect(limiter.check('k')).toBe(false)
    vi.setSystemTime(2500)
    expect(limiter.check('k')).toBe(true)
  })
})

describe('hashIp', () => {
  it('is deterministic for the same ip + salt', () => {
    const h = new Headers({ 'x-forwarded-for': '1.2.3.4' })
    expect(hashIp(h, 'salt')).toBe(hashIp(new Headers({ 'x-forwarded-for': '1.2.3.4' }), 'salt'))
  })

  it('changes with the salt', () => {
    const h = () => new Headers({ 'x-forwarded-for': '1.2.3.4' })
    expect(hashIp(h(), 'salt-a')).not.toBe(hashIp(h(), 'salt-b'))
  })

  it('returns a 32-char hex digest', () => {
    const out = hashIp(new Headers({ 'x-forwarded-for': '1.2.3.4' }), 'salt')
    expect(out).toMatch(/^[0-9a-f]{32}$/)
  })

  it('uses the first x-forwarded-for ip', () => {
    const a = hashIp(new Headers({ 'x-forwarded-for': '1.2.3.4, 9.9.9.9' }), 'salt')
    const b = hashIp(new Headers({ 'x-forwarded-for': '1.2.3.4' }), 'salt')
    expect(a).toBe(b)
  })

  it('falls back to x-real-ip then "unknown"', () => {
    const real = hashIp(new Headers({ 'x-real-ip': '5.6.7.8' }), 'salt')
    expect(real).toBe(hashIp(new Headers({ 'x-real-ip': '5.6.7.8' }), 'salt'))
    const none = hashIp(new Headers(), 'salt')
    expect(none).toBe(hashIp(new Headers(), 'salt'))
    expect(real).not.toBe(none)
  })
})

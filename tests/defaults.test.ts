import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { resolveOptions, DEFAULT_SUCCESS_MESSAGE } from '../src/defaults.js'

describe('resolveOptions', () => {
  const saved = { ...process.env }
  beforeEach(() => {
    delete process.env.CONTACT_IP_SALT
    delete process.env.COMMENTS_IP_SALT
  })
  afterEach(() => {
    process.env = { ...saved }
  })

  it('applies defaults when no options are given', () => {
    const o = resolveOptions()
    expect(o.enabled).toBe(true)
    expect(o.minLength).toBe(10)
    expect(o.maxLength).toBe(5000)
    expect(o.requireSubject).toBe(false)
    expect(o.blockedKeywords).toEqual([])
    expect(o.notificationEmail).toBe('')
    expect(o.successMessage).toBe(DEFAULT_SUCCESS_MESSAGE)
    expect(o.rateLimit).toEqual({ windowMs: 60_000, max: 3 })
    expect(o.messagesSlug).toBe('contact-messages')
    expect(o.disabled).toBe(false)
    expect(o.ipSalt).toBe('navanem-contact-salt')
  })

  it('respects explicit overrides', () => {
    const o = resolveOptions({
      minLength: 5,
      maxLength: 100,
      requireSubject: true,
      blockedKeywords: ['casino'],
      messagesSlug: 'inbox',
      rateLimit: { windowMs: 1000, max: 1 },
    })
    expect(o.minLength).toBe(5)
    expect(o.maxLength).toBe(100)
    expect(o.requireSubject).toBe(true)
    expect(o.blockedKeywords).toEqual(['casino'])
    expect(o.messagesSlug).toBe('inbox')
    expect(o.rateLimit).toEqual({ windowMs: 1000, max: 1 })
  })

  it('resolves ipSalt: option > CONTACT_IP_SALT > COMMENTS_IP_SALT > default', () => {
    expect(resolveOptions({ ipSalt: 'opt' }).ipSalt).toBe('opt')
    process.env.CONTACT_IP_SALT = 'contact-env'
    expect(resolveOptions().ipSalt).toBe('contact-env')
    delete process.env.CONTACT_IP_SALT
    process.env.COMMENTS_IP_SALT = 'comments-env'
    expect(resolveOptions().ipSalt).toBe('comments-env')
  })
})

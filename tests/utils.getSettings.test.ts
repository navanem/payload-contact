import { describe, it, expect } from 'vitest'
import { getContactSettings, readPublicContactSettings } from '../src/utils/getSettings.js'
import { resolveOptions, DEFAULT_SUCCESS_MESSAGE } from '../src/defaults.js'
import { makeFakePayload } from './helpers/fakePayload.js'

describe('getContactSettings', () => {
  it('reads values from the saved global and parses keywords', async () => {
    const { payload } = makeFakePayload({
      global: {
        enabled: false,
        minLength: 20,
        maxLength: 999,
        requireSubject: true,
        blockedKeywords: 'Spam, Casino\nWin',
        successMessage: 'Got it!',
      },
    })
    const s = await getContactSettings(payload, resolveOptions())
    expect(s).toEqual({
      enabled: false,
      minLength: 20,
      maxLength: 999,
      requireSubject: true,
      blockedKeywords: ['spam', 'casino', 'win'],
      successMessage: 'Got it!',
    })
  })

  it('falls back to options for wrong-typed global fields', async () => {
    const { payload } = makeFakePayload({
      global: { enabled: 'yes', minLength: '5', successMessage: '' },
    })
    const opts = resolveOptions({ minLength: 7, blockedKeywords: ['X'] })
    const s = await getContactSettings(payload, opts)
    expect(s.enabled).toBe(opts.enabled)
    expect(s.minLength).toBe(7)
    expect(s.successMessage).toBe(opts.successMessage)
    expect(s.blockedKeywords).toEqual(['x'])
  })

  it('fails open to options when findGlobal throws', async () => {
    const { payload } = makeFakePayload({ throwOnGlobal: true })
    const opts = resolveOptions({ minLength: 42 })
    const s = await getContactSettings(payload, opts)
    expect(s.minLength).toBe(42)
    expect(s.enabled).toBe(true)
  })
})

describe('readPublicContactSettings', () => {
  it('returns enabled + successMessage from the global', async () => {
    const { payload } = makeFakePayload({ global: { enabled: false, successMessage: 'Hi there' } })
    expect(await readPublicContactSettings(payload)).toEqual({ enabled: false, successMessage: 'Hi there' })
  })

  it('returns defaults when findGlobal throws', async () => {
    const { payload } = makeFakePayload({ throwOnGlobal: true })
    expect(await readPublicContactSettings(payload)).toEqual({
      enabled: true,
      successMessage: DEFAULT_SUCCESS_MESSAGE,
    })
  })
})

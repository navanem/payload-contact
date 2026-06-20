import { describe, it, expect } from 'vitest'
import { submitContact } from '../src/services/submitContact.js'
import { resolveOptions } from '../src/defaults.js'
import { makeFakePayload } from './helpers/fakePayload.js'

const validInput = {
  name: 'Ada',
  email: 'ada@example.com',
  message: 'This is a long enough message.',
}

describe('submitContact', () => {
  it('silently drops honeypot hits without storing', async () => {
    const { payload, created } = makeFakePayload()
    const res = await submitContact(payload, resolveOptions(), { ...validInput, honeypot: 'bot' })
    expect(res).toEqual({ ok: true, dropped: true })
    expect(created).toHaveLength(0)
  })

  it('rejects with 403 when the form is closed', async () => {
    const { payload, created } = makeFakePayload({ global: { enabled: false } })
    const res = await submitContact(payload, resolveOptions(), validInput)
    expect(res).toEqual({ ok: false, status: 403, error: expect.any(String) })
    expect(created).toHaveLength(0)
  })

  it('rejects 400 on missing fields', async () => {
    const { payload } = makeFakePayload()
    const res = await submitContact(payload, resolveOptions(), { name: '', email: '', message: '' })
    expect(res).toMatchObject({ ok: false, status: 400 })
  })

  it('rejects 400 on invalid email', async () => {
    const { payload } = makeFakePayload()
    const res = await submitContact(payload, resolveOptions(), { ...validInput, email: 'not-an-email' })
    expect(res).toMatchObject({ ok: false, status: 400 })
  })

  it('rejects 400 when the message is too short', async () => {
    const { payload } = makeFakePayload()
    const res = await submitContact(payload, resolveOptions({ minLength: 10 }), { ...validInput, message: 'hi' })
    expect(res).toMatchObject({ ok: false, status: 400 })
  })

  it('rejects 400 when requireSubject is on and subject is missing', async () => {
    const { payload } = makeFakePayload()
    const res = await submitContact(payload, resolveOptions({ requireSubject: true }), validInput)
    expect(res).toMatchObject({ ok: false, status: 400 })
  })

  it('drops blocked-keyword spam without storing', async () => {
    const { payload, created } = makeFakePayload()
    const res = await submitContact(payload, resolveOptions({ blockedKeywords: ['casino'] }), {
      ...validInput,
      message: 'Best CASINO bonus, click here now.',
    })
    expect(res).toEqual({ ok: true, dropped: true })
    expect(created).toHaveLength(0)
  })

  it('stores a valid submission with status "new"', async () => {
    const { payload, created } = makeFakePayload()
    const res = await submitContact(payload, resolveOptions(), {
      ...validInput,
      subject: 'Hello',
    })
    expect(res).toEqual({ ok: true })
    expect(created).toHaveLength(1)
    expect(created[0].collection).toBe('contact-messages')
    expect(created[0].data).toMatchObject({
      name: 'Ada',
      email: 'ada@example.com',
      subject: 'Hello',
      message: 'This is a long enough message.',
      status: 'new',
    })
  })
})

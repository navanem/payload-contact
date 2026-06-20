import type { Payload, PayloadRequest } from 'payload'
import type { ResolvedOptions } from '../types.js'
import { getContactSettings } from '../utils/getSettings.js'

export type SubmitInput = {
  name: string
  email: string
  subject?: string
  message: string
  honeypot?: string
}

export type SubmitResult =
  | { ok: true; dropped?: boolean }
  | { ok: false; status: number; error: string }

const clean = (v: unknown, max: number): string => (typeof v === 'string' ? v.trim().slice(0, max) : '')

/**
 * Validate a contact submission against the runtime settings and store it. Honeypot
 * hits and blocked-keyword spam return `{ ok: true, dropped: true }` so bots get no
 * useful signal but nothing is stored.
 */
export async function submitContact(
  payload: Payload,
  options: ResolvedOptions,
  input: SubmitInput,
  req?: PayloadRequest,
): Promise<SubmitResult> {
  // Honeypot — a real user never fills this.
  if (clean(input.honeypot, 100)) return { ok: true, dropped: true }

  const settings = await getContactSettings(payload, options)
  if (!settings.enabled) {
    return { ok: false, status: 403, error: 'The contact form is currently closed. Please try again later.' }
  }

  const name = clean(input.name, 120)
  const email = clean(input.email, 200)
  const subject = clean(input.subject, 200)
  const message = clean(input.message, settings.maxLength)

  if (!name || !email || !message) {
    return { ok: false, status: 400, error: 'Please fill in your name, email and message.' }
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { ok: false, status: 400, error: 'Please enter a valid email address.' }
  }
  if (message.length < settings.minLength) {
    return { ok: false, status: 400, error: 'Your message is a little short — add a few more details.' }
  }
  if (settings.requireSubject && !subject) {
    return { ok: false, status: 400, error: 'Please add a subject.' }
  }

  const haystack = `${subject} ${message}`.toLowerCase()
  if (settings.blockedKeywords.some((k) => k && haystack.includes(k))) {
    return { ok: true, dropped: true }
  }

  await payload.create({
    collection: options.messagesSlug,
    data: { name, email, subject: subject || undefined, message, status: 'new' },
    overrideAccess: true,
    req,
  })
  return { ok: true }
}

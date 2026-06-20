import type { Payload } from 'payload'
import nodemailer from 'nodemailer'
import { CONTACT_SETTINGS_SLUG } from '../globals/ContactSettings.js'

/**
 * Email a notification for a new contact message, using the SMTP settings stored on
 * the Contact Settings global. No-op unless `notifyOnSubmit` is on and an SMTP host +
 * recipient are configured. Fire-and-forget — never throws into the caller.
 */
export async function sendContactNotification(
  payload: Payload,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  doc: Record<string, any>,
): Promise<void> {
  try {
    const s = (await payload.findGlobal({
      slug: CONTACT_SETTINGS_SLUG,
      depth: 0,
      overrideAccess: true,
    })) as Record<string, unknown>

    const to = typeof s.notificationEmail === 'string' ? s.notificationEmail.trim() : ''
    const host = typeof s.smtpHost === 'string' ? s.smtpHost.trim() : ''
    if (!s.notifyOnSubmit || !host || !to) return

    const transport = nodemailer.createTransport({
      host,
      port: Number(s.smtpPort) || 587,
      secure: Boolean(s.smtpSecure),
      auth: s.smtpUser ? { user: String(s.smtpUser), pass: String(s.smtpPassword ?? '') } : undefined,
    })

    const name = String(doc.name ?? 'Someone')
    const email = String(doc.email ?? '')
    const subject = String(doc.subject ?? '').trim()
    const message = String(doc.message ?? '')

    await transport.sendMail({
      from: String(s.smtpFrom || s.smtpUser || to),
      to,
      replyTo: email || undefined,
      subject: `[Contact] ${subject || 'New message'} — ${name}`,
      text: `New contact message\n\nFrom: ${name} <${email}>\nSubject: ${subject || '(none)'}\n\n${message}\n`,
    })
  } catch (e) {
    payload.logger?.error?.(`[contact] notification email failed: ${(e as Error)?.message ?? e}`)
  }
}

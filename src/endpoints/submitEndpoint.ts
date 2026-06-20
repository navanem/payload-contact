import type { Endpoint, PayloadRequest } from 'payload'
import { addDataAndFileToRequest } from 'payload'
import type { ResolvedOptions } from '../types.js'
import { submitContact } from '../services/submitContact.js'
import { createRateLimiter, hashIp } from '../utils/rateLimit.js'

/**
 * POST /api/contact-api/submit  { name, email, subject?, message, company? }
 *
 * The path lives under `/contact-api/*`, NOT the collection slug, so it never
 * collides with the contact-messages collection's own REST namespace.
 */
export function submitEndpoint(options: ResolvedOptions): Endpoint {
  const limiter = createRateLimiter(options.rateLimit)
  return {
    path: '/contact-api/submit',
    method: 'post',
    handler: async (req: PayloadRequest) => {
      await addDataAndFileToRequest(req)
      const data = (req.data ?? {}) as Record<string, unknown>

      const ipHash = hashIp(req.headers, options.ipSalt)
      if (!limiter.check(ipHash)) {
        return Response.json({ error: 'Too many messages — please slow down and try again shortly.' }, { status: 429 })
      }

      try {
        const result = await submitContact(
          req.payload,
          options,
          {
            name: String(data.name ?? ''),
            email: String(data.email ?? ''),
            subject: data.subject ? String(data.subject) : undefined,
            message: String(data.message ?? ''),
            honeypot: data.company ? String(data.company) : '',
          },
          req,
        )
        if (!result.ok) return Response.json({ error: result.error }, { status: result.status })
        return Response.json({ ok: true })
      } catch (err) {
        req.payload.logger.error(`[contact] submit failed: ${(err as Error)?.message ?? err}`)
        return Response.json({ error: 'Something went wrong on our end. Please try again.' }, { status: 500 })
      }
    },
  }
}

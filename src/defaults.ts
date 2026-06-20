import type { ContactPluginOptions, ResolvedOptions } from './types.js'

export const DEFAULT_SUCCESS_MESSAGE =
  "Message sent — thank you. I read every message and will get back to you by email."

export function resolveOptions(options: ContactPluginOptions = {}): ResolvedOptions {
  return {
    enabled: options.enabled ?? true,
    minLength: options.minLength ?? 10,
    maxLength: options.maxLength ?? 5000,
    requireSubject: options.requireSubject ?? false,
    blockedKeywords: options.blockedKeywords ?? [],
    notificationEmail: options.notificationEmail ?? '',
    successMessage: options.successMessage ?? DEFAULT_SUCCESS_MESSAGE,
    rateLimit: options.rateLimit ?? { windowMs: 60_000, max: 3 },
    messagesSlug: options.messagesSlug ?? 'contact-messages',
    ipSalt: options.ipSalt ?? process.env.CONTACT_IP_SALT ?? process.env.COMMENTS_IP_SALT ?? 'navanem-contact-salt',
    disabled: options.disabled ?? false,
  }
}

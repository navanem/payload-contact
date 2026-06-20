/** Options accepted by contactPlugin(). */
export interface ContactPluginOptions {
  /** Accept new submissions. Default: true. (Runtime-overridable via the settings global.) */
  enabled?: boolean
  /** Minimum message length in characters. Default: 10. */
  minLength?: number
  /** Maximum message length in characters. Default: 5000. */
  maxLength?: number
  /** Require the subject field. Default: false. */
  requireSubject?: boolean
  /** Lines/comma-separated keywords; a message containing any is rejected as spam. */
  blockedKeywords?: string[]
  /** Address to notify on a new message (stored only; no email is sent without an adapter). */
  notificationEmail?: string
  /** Message shown to the visitor after a successful submission. */
  successMessage?: string
  /** Sliding-window rate limit per hashed IP. Default: { windowMs: 60000, max: 3 }. */
  rateLimit?: { windowMs: number; max: number }
  /** Slug for the messages collection. Default: "contact-messages". */
  messagesSlug?: string
  /** Salt used to hash IPs. Falls back to CONTACT_IP_SALT / COMMENTS_IP_SALT env. */
  ipSalt?: string
  /** When true the plugin is a no-op (collection + global still added so the schema is stable). */
  disabled?: boolean
}

/** Fully-resolved options after defaults are applied. */
export interface ResolvedOptions
  extends Required<Omit<ContactPluginOptions, 'ipSalt' | 'disabled' | 'notificationEmail'>> {
  notificationEmail: string
  ipSalt: string
  disabled: boolean
}

export interface ContactSubmission {
  name: string
  email: string
  subject?: string | null
  message: string
}

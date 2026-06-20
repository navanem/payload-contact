import type { Payload } from 'payload'
import type { ResolvedOptions } from '../types.js'
import { CONTACT_SETTINGS_SLUG } from '../globals/ContactSettings.js'
import { DEFAULT_SUCCESS_MESSAGE } from '../defaults.js'

export interface RuntimeContactSettings {
  enabled: boolean
  minLength: number
  maxLength: number
  requireSubject: boolean
  blockedKeywords: string[]
  successMessage: string
}

function splitKeywords(value: unknown, fallback: string[]): string[] {
  if (typeof value !== 'string') return fallback
  const list = value
    .split(/[\n,]/)
    .map((k) => k.trim().toLowerCase())
    .filter(Boolean)
  return list
}

/**
 * Resolve the live contact settings from the Contact Settings global, falling back
 * to the plugin options. Fail-open: if the global is unsaved (returns defaults) or
 * its table does not exist yet (pre-migration), the plugin options are used.
 */
export async function getContactSettings(
  payload: Payload,
  options: ResolvedOptions,
): Promise<RuntimeContactSettings> {
  const fallback: RuntimeContactSettings = {
    enabled: options.enabled,
    minLength: options.minLength,
    maxLength: options.maxLength,
    requireSubject: options.requireSubject,
    blockedKeywords: options.blockedKeywords.map((k) => k.toLowerCase()),
    successMessage: options.successMessage,
  }
  try {
    const s = (await payload.findGlobal({ slug: CONTACT_SETTINGS_SLUG, depth: 0, overrideAccess: true })) as Record<
      string,
      unknown
    >
    return {
      enabled: typeof s.enabled === 'boolean' ? s.enabled : fallback.enabled,
      minLength: typeof s.minLength === 'number' ? s.minLength : fallback.minLength,
      maxLength: typeof s.maxLength === 'number' ? s.maxLength : fallback.maxLength,
      requireSubject: typeof s.requireSubject === 'boolean' ? s.requireSubject : fallback.requireSubject,
      blockedKeywords: splitKeywords(s.blockedKeywords, fallback.blockedKeywords),
      successMessage: typeof s.successMessage === 'string' && s.successMessage ? s.successMessage : fallback.successMessage,
    }
  } catch {
    return fallback
  }
}

/**
 * Options-free reader for the public /contact page (no plugin options on hand):
 * returns whether the form is open + the success message, with built-in defaults.
 */
export async function readPublicContactSettings(
  payload: Payload,
): Promise<{ enabled: boolean; successMessage: string }> {
  try {
    const s = (await payload.findGlobal({ slug: CONTACT_SETTINGS_SLUG, depth: 0, overrideAccess: true })) as Record<
      string,
      unknown
    >
    return {
      enabled: typeof s.enabled === 'boolean' ? s.enabled : true,
      successMessage:
        typeof s.successMessage === 'string' && s.successMessage ? s.successMessage : DEFAULT_SUCCESS_MESSAGE,
    }
  } catch {
    return { enabled: true, successMessage: DEFAULT_SUCCESS_MESSAGE }
  }
}

import type { Config } from 'payload'
import type { ContactPluginOptions } from './types.js'
import { resolveOptions } from './defaults.js'
import { buildContactMessagesCollection } from './collections/ContactMessages.js'
import { buildContactSettings } from './globals/ContactSettings.js'
import { submitEndpoint } from './endpoints/submitEndpoint.js'

export type { ContactPluginOptions } from './types.js'
export { CONTACT_SETTINGS_SLUG } from './globals/ContactSettings.js'
export { getContactSettings, readPublicContactSettings } from './utils/getSettings.js'

/**
 * navanem_payload_contact — a contact form + admin inbox for Payload.
 *
 * Adds a `contact-messages` collection (admin inbox), a `contact-settings` global
 * (runtime on/off, validation, spam filtering, success message), a public submit
 * endpoint at `/contact-api/submit`, and an admin "Contact Inbox" stats view. The
 * public `<ContactForm/>` ships from `exports/client`.
 */
export const contactPlugin =
  (pluginOptions: ContactPluginOptions = {}) =>
  (incomingConfig: Config): Config => {
    const options = resolveOptions(pluginOptions)
    const config = { ...incomingConfig }

    // Collection + settings global are always registered (stable DB schema).
    config.collections = [...(config.collections ?? []), buildContactMessagesCollection(options)]
    config.globals = [...(config.globals ?? []), buildContactSettings(options)]

    if (options.disabled) return config

    config.endpoints = [...(config.endpoints ?? []), submitEndpoint(options)]

    config.admin = {
      ...config.admin,
      components: {
        ...config.admin?.components,
        afterNavLinks: [
          ...(config.admin?.components?.afterNavLinks ?? []),
          '@/plugins/payload-contact/components/ContactInboxNavLink#ContactInboxNavLink',
        ],
        views: {
          ...config.admin?.components?.views,
          contactInbox: {
            Component: '@/plugins/payload-contact/components/ContactInboxView#ContactInboxView',
            path: '/contact-inbox',
          },
        },
      },
    }

    return config
  }

export default contactPlugin

import type { CollectionConfig } from 'payload'
import type { ResolvedOptions } from '../types.js'

/**
 * Inbox collection for the contact form. Public submissions arrive through the
 * validated `/contact-api/submit` endpoint (which inserts with overrideAccess), so
 * `create` is closed to the REST API; admins read/triage messages here.
 */
export function buildContactMessagesCollection(options: ResolvedOptions): CollectionConfig {
  return {
    slug: options.messagesSlug,
    admin: {
      group: 'Contact',
      useAsTitle: 'subject',
      defaultColumns: ['name', 'email', 'subject', 'status', 'createdAt'],
      description: 'Messages submitted through the public /contact form.',
      pagination: { defaultLimit: 25 },
    },
    access: {
      read: ({ req }) => Boolean(req.user),
      create: () => false,
      update: ({ req }) => Boolean(req.user),
      delete: ({ req }) => Boolean(req.user),
    },
    fields: [
      { name: 'name', type: 'text', required: true },
      { name: 'email', type: 'email', required: true },
      { name: 'subject', type: 'text' },
      { name: 'message', type: 'textarea', required: true },
      {
        name: 'status',
        type: 'select',
        defaultValue: 'new',
        options: [
          { label: 'New', value: 'new' },
          { label: 'Read', value: 'read' },
          { label: 'Replied', value: 'replied' },
        ],
        admin: { position: 'sidebar' },
      },
    ],
  }
}

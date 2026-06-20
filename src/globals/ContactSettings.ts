import type { GlobalConfig } from 'payload'
import type { ResolvedOptions } from '../types.js'

export const CONTACT_SETTINGS_SLUG = 'contact-settings'

/**
 * Runtime settings for the contact plugin. Lets an admin open/close the form,
 * tune validation and spam filtering, and set a success message — without a
 * redeploy. The submit endpoint + the /contact page consult this (fail-open to
 * the plugin options if the global is unsaved or pre-migration).
 */
export function buildContactSettings(options: ResolvedOptions): GlobalConfig {
  return {
    slug: CONTACT_SETTINGS_SLUG,
    label: 'Contact Settings',
    admin: {
      group: 'Contact',
      description: 'Open or close the contact form, tune validation and spam filtering, set the success message.',
    },
    access: {
      // Admin-only read: the public consumers (submit endpoint + /contact page) read
      // this with overrideAccess, so the SMTP credentials below never leave the server.
      read: ({ req: { user } }) => Boolean(user),
      update: ({ req: { user } }) => Boolean(user),
    },
    fields: [
      {
        name: 'enabled',
        type: 'checkbox',
        defaultValue: options.enabled,
        label: 'Accept new messages',
        admin: { description: 'When off, the form shows a "closed" notice and submissions are rejected.' },
      },
      {
        name: 'successMessage',
        type: 'textarea',
        defaultValue: options.successMessage,
        admin: { description: 'Shown to the visitor after a message is sent.' },
      },
      {
        type: 'row',
        fields: [
          {
            name: 'minLength',
            type: 'number',
            defaultValue: options.minLength,
            min: 1,
            admin: { width: '50%', description: 'Minimum message length (characters).' },
          },
          {
            name: 'maxLength',
            type: 'number',
            defaultValue: options.maxLength,
            min: 1,
            admin: { width: '50%', description: 'Maximum message length (characters).' },
          },
        ],
      },
      {
        name: 'requireSubject',
        type: 'checkbox',
        defaultValue: options.requireSubject,
        label: 'Require a subject',
      },
      {
        name: 'blockedKeywords',
        type: 'textarea',
        defaultValue: options.blockedKeywords.join('\n'),
        admin: {
          description: 'One keyword/phrase per line. A message containing any of these is silently rejected as spam.',
        },
      },
      {
        type: 'collapsible',
        label: 'Email notifications',
        admin: {
          initCollapsed: true,
          description: 'Email yourself when a new message arrives. Requires SMTP; credentials are admin-only.',
        },
        fields: [
          {
            name: 'notifyOnSubmit',
            type: 'checkbox',
            defaultValue: false,
            label: 'Send an email on each new message',
          },
          {
            name: 'notificationEmail',
            type: 'email',
            defaultValue: options.notificationEmail || undefined,
            label: 'Send notifications to',
          },
          {
            type: 'row',
            fields: [
              { name: 'smtpHost', type: 'text', admin: { width: '68%', placeholder: 'smtp.example.com' } },
              { name: 'smtpPort', type: 'number', defaultValue: 587, admin: { width: '32%' } },
            ],
          },
          {
            type: 'row',
            fields: [
              { name: 'smtpUser', type: 'text', admin: { width: '50%', description: 'SMTP username.' } },
              { name: 'smtpPassword', type: 'text', admin: { width: '50%', description: 'SMTP password / app key (stored as-is, admin-only).' } },
            ],
          },
          { name: 'smtpSecure', type: 'checkbox', defaultValue: false, label: 'Implicit TLS (port 465)' },
          { name: 'smtpFrom', type: 'email', admin: { description: 'From address (defaults to the SMTP user).' } },
        ],
      },
    ],
  }
}

# @navanem/payload-contact

A contact-form plugin for **Payload 3.x**. It gives you a public form component, a
validated submit endpoint with built-in spam protection, an admin **inbox** to read
and triage messages, and a **settings** global to open/close the form and tune it at
runtime — no redeploy required. No email is sent or exposed; messages are stored in
your Payload admin.

> Built by [navanem](https://www.navanem.com) — the same author as
> [@navanem/payload-comments](https://github.com/navanem/navanem_payload_comments).

## Features

- **Message inbox** — a `contact-messages` collection (admin-read) with `new / read /
  replied` status, so the form acts as a triageable inbox.
- **Settings global** — open or close the form, set min/max length, require a subject,
  block spam keywords, and set the success message, all at runtime.
- **Spam protection** — a hidden honeypot field plus a per-IP sliding-window rate limit;
  blocked submissions are silently dropped (no useful signal to bots).
- **Admin Inbox view** — a dedicated stats page (`/admin/contact-inbox`) with KPIs
  (total / new / read / replied), period filters and a recent-messages table.
- **Drop-in form** — a styled, themeable `<ContactForm />` client component.
- **Optional email notifications** — opt-in SMTP delivery configured from the admin
  settings (no static email adapter required); off by default.

## Installation

This plugin follows the same **vendored** model as `@navanem/payload-comments`: copy the
source into your project (so the admin component paths resolve via your import map), or
install from npm once published.

### A. Vendor it (recommended)

```bash
# copy the plugin source into your project
cp -r node_modules/@navanem/payload-contact/src src/plugins/payload-contact
# (or git clone and copy src/ in)
```

Then register the admin components in your generated `app/(payload)/admin/importMap.js`:

```js
import { ContactInboxView } from '@/plugins/payload-contact/components/ContactInboxView'
import { ContactInboxNavLink } from '@/plugins/payload-contact/components/ContactInboxNavLink'

export const importMap = {
  // ...
  '@/plugins/payload-contact/components/ContactInboxView#ContactInboxView': ContactInboxView,
  '@/plugins/payload-contact/components/ContactInboxNavLink#ContactInboxNavLink': ContactInboxNavLink,
}
```

### B. Install from npm

```bash
npm install @navanem/payload-contact
```

## Quick start

### 1. Register the plugin

```ts
// payload.config.ts
import { contactPlugin } from '@navanem/payload-contact' // or '@/plugins/payload-contact'

export default buildConfig({
  // ...
  plugins: [
    contactPlugin({
      notificationEmail: 'you@example.com',
    }),
  ],
})
```

### 2. Create the database tables

The plugin adds a `contact-messages` collection and a `contact-settings` global. Generate
and run a migration:

```bash
payload migrate:create contact_plugin
payload migrate
```

The expected tables are `contact_messages` (with an `enum_contact_messages_status` enum
and a `payload_locked_documents_rels.contact_messages_id` FK) and `contact_settings`.

### 3. Add the form to a page

```tsx
import { ContactForm } from '@navanem/payload-contact/client'

export default function ContactPage() {
  return <ContactForm successMessage="Thanks — I'll get back to you by email." />
}
```

The form POSTs JSON to the plugin's endpoint:

```
POST /api/contact-api/submit   { name, email, subject?, message, company? }  -> { ok: true }
```

`company` is the honeypot field (kept hidden by the component). The endpoint path lives
under `/contact-api/*` — **not** the collection slug — so it never collides with the
`contact-messages` REST namespace.

## Configuration

`contactPlugin(options)` — all options are optional:

| Option              | Type                              | Default            | Description |
| ------------------- | --------------------------------- | ------------------ | ----------- |
| `enabled`           | `boolean`                         | `true`             | Accept new submissions (runtime-overridable via the settings global). |
| `minLength`         | `number`                          | `10`               | Minimum message length. |
| `maxLength`         | `number`                          | `5000`             | Maximum message length. |
| `requireSubject`    | `boolean`                         | `false`            | Require the subject field. |
| `blockedKeywords`   | `string[]`                        | `[]`               | A message containing any of these is dropped as spam. |
| `notificationEmail` | `string`                          | `''`               | Stored for future email notifications (no email is sent without an adapter). |
| `successMessage`    | `string`                          | sensible default   | Shown to the visitor after a successful submission. |
| `rateLimit`         | `{ windowMs: number; max: number }` | `{ 60000, 3 }`   | Per-IP sliding-window limit. |
| `messagesSlug`      | `string`                          | `contact-messages` | Slug for the inbox collection. |
| `ipSalt`            | `string`                          | `CONTACT_IP_SALT` env | Salt for hashing IPs in the rate limiter. |
| `disabled`          | `boolean`                         | `false`            | No-op (collection + global still registered so the schema stays stable). |

## Runtime settings

A **Contact Settings** global appears in the admin (group "Contact"). An admin can
toggle the form on/off, change the min/max length, require a subject, edit the blocked
keywords, and set the success message — applied immediately, no redeploy. The endpoint
and the page **fail open** to the plugin options if the global has never been saved.

## Admin inbox

- **Contact Messages** — the collection list; open a message, change its status.
- **Contact Inbox** (`/admin/contact-inbox`) — KPIs, period filters and a recent table.
- The view is auth-guarded server-side (`if (!req.user) return null`) so message data
  never leaks into unauthenticated SSR output.

## The form component

`<ContactForm />` is a client component styled with a CSS module using `--pc-*` custom
properties (with sensible defaults), so you can theme it by overriding those variables.

| Prop             | Default                       | Description |
| ---------------- | ----------------------------- | ----------- |
| `successMessage` | a default thank-you           | Shown after submit. |
| `disabled`       | `false`                       | Render a "closed" notice instead of the form. |
| `endpoint`       | `/api/contact-api/submit`     | Submit URL. |
| `className`      | —                             | Extra class on the root element. |

## Email notifications (optional)

Off by default — messages always land in the inbox. To also get emailed on each new
message, open **Contact Settings** in the admin, expand **Email notifications**, tick
"Send an email on each new message", and fill in the recipient + SMTP host/port/user/
password/TLS/from. An `afterChange` hook then sends via [nodemailer](https://nodemailer.com/)
on every new submission. The SMTP credentials live on an **admin-read-only** global, so
they never reach the client.

## License

MIT © navanem · [www.navanem.com](https://www.navanem.com)

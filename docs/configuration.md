# Configuration

`contactPlugin(options)` accepts the following options — all optional. Several are
also overridable at runtime via the **Contact Settings** global (no redeploy).

| Option | Type | Default | Runtime-overridable | Description |
| --- | --- | --- | --- | --- |
| `enabled` | `boolean` | `true` | yes | Accept new submissions. |
| `minLength` | `number` | `10` | yes | Minimum message length. |
| `maxLength` | `number` | `5000` | yes | Maximum message length (longer messages are truncated). |
| `requireSubject` | `boolean` | `false` | yes | Require the subject field. |
| `blockedKeywords` | `string[]` | `[]` | yes | A message/subject containing any of these is silently dropped. |
| `notificationEmail` | `string` | `''` | yes | Default recipient for email notifications; editable (and activated) from the settings global. See [inbox-and-triage.md](inbox-and-triage.md). |
| `successMessage` | `string` | sensible default | yes | Shown after a successful submission. |
| `rateLimit` | `{ windowMs, max }` | `{ 60000, 3 }` | no | Per-hashed-IP sliding window. |
| `messagesSlug` | `string` | `contact-messages` | no | Slug of the inbox collection. |
| `ipSalt` | `string` | see below | no | Salt for hashing IPs. |
| `disabled` | `boolean` | `false` | no | No-op mode; the collection + global stay registered so the DB schema is stable. |

## Runtime settings (Contact Settings global)

A **Contact Settings** global appears in the admin under the "Contact" group. An admin
can toggle the form, change min/max length, require a subject, edit the blocked
keywords, and set the success message — applied immediately. Resolution **fails open**:
if the global has never been saved or its table does not exist yet (pre-migration),
the plugin options are used.

It also holds an **Email notifications** section (opt-in SMTP delivery — see
[inbox-and-triage.md](inbox-and-triage.md)). Because those fields include SMTP
credentials, the global is **admin-read only**: public consumers (the submit endpoint and
the `/contact` page) read it server-side with `overrideAccess`, so credentials never
reach the client.

## Environment variables

- `CONTACT_IP_SALT` — salt used to hash visitor IPs in the rate limiter.
- `COMMENTS_IP_SALT` — used as a fallback if `CONTACT_IP_SALT` is unset (shared with the
  sibling comments plugin).

Resolution order for the salt: `options.ipSalt` → `CONTACT_IP_SALT` → `COMMENTS_IP_SALT`
→ a built-in default (`navanem-contact-salt`). Set one in production.

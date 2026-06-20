# Frontend integration

## The `<ContactForm />` component

`<ContactForm />` is a client component shipped from `@navanem/payload-contact/client`.

```tsx
import { ContactForm } from '@navanem/payload-contact/client'

export default function ContactPage() {
  return <ContactForm successMessage="Thanks — I'll reply by email." />
}
```

| Prop | Default | Description |
| --- | --- | --- |
| `successMessage` | a default thank-you | Shown after a successful submit. |
| `disabled` | `false` | Render a "closed" notice instead of the form. |
| `endpoint` | `/api/contact-api/submit` | Submit URL. |
| `className` | — | Extra class on the root element. |

## Theming

The component is styled with a CSS module driven by `--pc-*` custom properties (each
with a sensible default). Override them on a wrapping element to theme the form, e.g.:

```css
.my-contact { --pc-accent: #2b6cb0; --pc-radius: 12px; }
```

## Endpoint contract

The form POSTs JSON to the plugin endpoint (note the `/contact-api/*` namespace, kept
separate from the `contact-messages` REST namespace so the two never collide):

```
POST /api/contact-api/submit
{ "name": "...", "email": "...", "subject": "(optional)", "message": "...", "company": "" }
-> { "ok": true }
```

`company` is the honeypot field — the component keeps it hidden; a non-empty value makes
the submission be silently dropped. On validation errors the endpoint returns
`{ ok: false, error }` with a 400/403 status.

## Reading public settings (custom forms)

If you build your own form, read whether the form is open and the success message with
`readPublicContactSettings(payload)`, which returns `{ enabled, successMessage }` and
falls back to defaults when the global is unsaved.

# Changelog

## 0.1.0 — 2026-06-20

Initial release.

- `contact-messages` inbox collection (admin-read; `new` / `read` / `replied` status).
- `contact-settings` global — runtime form on/off, min/max message length, require subject,
  blocked spam keywords, notification email, success message. Fails open to plugin options.
- Public submit endpoint `POST /api/contact-api/submit` with a honeypot field, a per-IP
  sliding-window rate limit, and full validation.
- Admin **Contact Inbox** stats view at `/admin/contact-inbox` (KPIs, period filters,
  recent-messages table) — auth-guarded server-side.
- `<ContactForm />` client component, themeable via `--pc-*` CSS custom properties.

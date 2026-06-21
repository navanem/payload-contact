# Changelog

## 0.2.1 — 2026-06-21

### Added
- Dev environment (`dev/`) with a sqlite-backed Payload app for local testing.
- Vitest test suite (`tests/`) covering defaults, rate limiting/IP hashing,
  `submitContact`, and contact-settings resolution.
- Documentation guides under `docs/` (configuration, frontend integration, inbox & triage).
- pnpm tooling: `.npmrc`, `pnpm-workspace.yaml`, `tsconfig.dev.json`, and
  `dev`/`test`/`test:watch` scripts.

### Fixed
- Build no longer fails on `tsc`: typed the `where` clause in the Contact Inbox view
  and added `@types/nodemailer` for the v0.2.0 SMTP notifier (both previously broke the
  `dist` build and the dev typecheck).

## 0.2.0 — 2026-06-20

- **Email notifications** — opt-in SMTP delivery configured entirely from the **Contact
  Settings** global (host / port / user / password / TLS / from + recipient). An
  `afterChange` hook emails you on each new message via nodemailer. Off by default — no
  email is sent until SMTP is configured.
- The Contact Settings global is now **admin-read only**; its SMTP credentials never reach
  the client (the form/page read settings server-side with `overrideAccess`).

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

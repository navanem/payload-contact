# Inbox & triage

The plugin stores every submission so the contact form acts as a triageable inbox.
Email notifications are off by default — every message always lands in the inbox.

## The messages collection

`contact-messages` (slug configurable via `messagesSlug`) holds each message with a
`status` of `new`, `read`, or `replied`. Open a message in the admin and change its
status as you work through the inbox.

## The Contact Inbox view

A dedicated admin view lives at `/admin/contact-inbox` (registered via
`afterNavLinks` + a custom view). It shows KPIs (total / new / read / replied), period
filters, and a recent-messages table. The view is auth-guarded server-side
(`if (!req.user) return null`) so message data never leaks into unauthenticated SSR
output.

> When vendoring the plugin, register the admin components in your generated
> `app/(payload)/admin/importMap.js` (see the README "Vendor it" section) so the view
> and nav link resolve.

## Email notifications (optional, built-in)

Since v0.2.0 the plugin can email you on each new message via SMTP — no separate email
adapter required. It is **off by default**; messages always land in the inbox regardless.

To turn it on, open **Contact Settings** in the admin, expand **Email notifications**, and:

1. tick **"Send an email on each new message"** (`notifyOnSubmit`),
2. set **"Send notifications to"** (`notificationEmail`),
3. fill in the SMTP host / port / user / password, optional implicit-TLS (port 465),
   and an optional from address (defaults to the SMTP user).

An `afterChange` hook on the messages collection then sends the notification via
[nodemailer](https://nodemailer.com/) on every new submission. Sending is
fire-and-forget: a failed email is logged via `payload.logger` and never blocks or fails
the visitor's submission.

The SMTP credentials live on the Contact Settings global, which is **admin-read only**:
the public submit endpoint and `/contact` page read settings server-side with
`overrideAccess`, so the credentials never reach the client.

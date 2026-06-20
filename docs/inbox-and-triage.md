# Inbox & triage

The plugin stores every submission so the contact form acts as a triageable inbox.
No email is sent by default.

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

## Sending an email notification (optional)

The plugin has no SMTP dependency. To notify yourself on each new message, add a Payload
email adapter and an `afterChange` hook on the messages collection:

```ts
// in your own collection override / config
hooks: {
  afterChange: [
    async ({ doc, operation, req }) => {
      if (operation !== 'create') return
      await req.payload.sendEmail({
        to: 'you@example.com',
        subject: `New contact message from ${doc.name}`,
        text: doc.message,
      })
    },
  ],
}
```

`notificationEmail` is stored in settings for this purpose but is never used to send mail
on its own.

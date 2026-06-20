import React from 'react'

/**
 * Nav link to the Contact Inbox view. Registered via `afterNavLinks` so the plugin
 * works with Payload's default Nav. Hosts with a custom Nav (this one) place the
 * link themselves and this entry stays inert.
 */
export function ContactInboxNavLink() {
  return (
    <a className="nav__link" href="/admin/contact-inbox">
      <span className="nav__link-label">Contact Inbox</span>
    </a>
  )
}

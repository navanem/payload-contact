'use client'

import React, { useState } from 'react'
import styles from './ContactForm.module.css'

export interface ContactFormProps {
  /** Message shown after a successful submission. */
  successMessage?: string
  /** When true, the form is replaced by a "closed" notice. */
  disabled?: boolean
  /** Submit endpoint. Default: the plugin endpoint mounted by Payload under /api. */
  endpoint?: string
  /** Optional class on the root <form>/wrapper for theming. */
  className?: string
}

const DEFAULT_SUCCESS = 'Message sent — thank you. We read every message and will get back to you.'

/** Public contact form. POSTs JSON to the plugin's submit endpoint. */
export function ContactForm({
  successMessage = DEFAULT_SUCCESS,
  disabled = false,
  endpoint = '/api/contact-api/submit',
  className,
}: ContactFormProps) {
  const [state, setState] = useState<'idle' | 'sending' | 'ok' | 'error'>('idle')
  const [error, setError] = useState('')

  if (disabled) {
    return (
      <div className={`${styles.form} ${className ?? ''}`}>
        <div className={styles.success}>
          <p className={styles.successTitle}>The contact form is currently closed.</p>
          <p className={styles.successBody}>Please check back soon.</p>
        </div>
      </div>
    )
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    setState('sending')
    setError('')
    const data = Object.fromEntries(new FormData(form).entries())
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError((json as { error?: string }).error || 'Something went wrong. Please try again.')
        setState('error')
        return
      }
      form.reset()
      setState('ok')
    } catch {
      setError('Network error — please try again.')
      setState('error')
    }
  }

  if (state === 'ok') {
    return (
      <div className={`${styles.form} ${className ?? ''}`}>
        <div className={styles.success}>
          <p className={styles.successTitle}>Thank you.</p>
          <p className={styles.successBody}>{successMessage}</p>
          <button type="button" className={styles.again} onClick={() => setState('idle')}>
            send another →
          </button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className={`${styles.form} ${className ?? ''}`} noValidate>
      {/* Honeypot — hidden from users, catches bots. */}
      <div aria-hidden className={styles.honeypot} tabIndex={-1}>
        <label>
          Company
          <input type="text" name="company" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className={`${styles.row} ${styles.two}`}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="pc-name">
            Name
          </label>
          <input id="pc-name" className={styles.input} name="name" required maxLength={120} autoComplete="name" placeholder="Your name" />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="pc-email">
            Email
          </label>
          <input id="pc-email" className={styles.input} name="email" type="email" required maxLength={200} autoComplete="email" placeholder="you@example.com" />
        </div>
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="pc-subject">
          Subject <span className={styles.optional}>(optional)</span>
        </label>
        <input id="pc-subject" className={styles.input} name="subject" maxLength={200} placeholder="What's this about?" />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="pc-message">
          Message
        </label>
        <textarea id="pc-message" className={styles.textarea} name="message" required minLength={10} maxLength={5000} rows={7} placeholder="How can we help?" />
      </div>

      {state === 'error' && <p className={styles.error}>{error}</p>}

      <div className={styles.actions}>
        <button type="submit" className={styles.button} disabled={state === 'sending'}>
          {state === 'sending' ? 'Sending…' : 'Send message'}
        </button>
        <span className={styles.note}>No spam, ever.</span>
      </div>
    </form>
  )
}

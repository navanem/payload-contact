import { DefaultTemplate } from '@payloadcms/next/templates'
import type { AdminViewServerProps } from 'payload'
import React from 'react'

const MESSAGES_SLUG = 'contact-messages'

const STATUSES = ['new', 'read', 'replied'] as const
type Status = (typeof STATUSES)[number]
const STATUS_COLOR: Record<Status, string> = { new: '#f59e0b', read: '#3b82f6', replied: '#22c55e' }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Doc = Record<string, any>

function sp(searchParams: AdminViewServerProps['searchParams'], key: string): string | null {
  const v = searchParams?.[key]
  return typeof v === 'string' && v.length > 0 ? v : null
}
function snippet(text: unknown, n = 120): string {
  const s = String(text ?? '').replace(/\s+/g, ' ').trim()
  return s.length > n ? `${s.slice(0, n)}…` : s
}

export async function ContactInboxView({ initPageResult, params, searchParams }: AdminViewServerProps) {
  const { req, visibleEntities } = initPageResult
  const { payload } = req

  // Auth gate: this server view queries message data; Payload only gates the admin
  // client-side, so without this the data would render into public SSR HTML.
  if (!req.user) return null

  const statusFilter = sp(searchParams, 'status') as Status | null
  const period = sp(searchParams, 'period') ?? 'all'
  const days = period === '7' ? 7 : period === '30' ? 30 : period === '90' ? 90 : null
  const since = days ? new Date(Date.now() - days * 86_400_000) : null
  const where = since ? { createdAt: { greater_than_equal: since.toISOString() } } : undefined

  const found = await payload.find({
    collection: MESSAGES_SLUG,
    depth: 0,
    limit: 10_000,
    pagination: false,
    sort: '-createdAt',
    overrideAccess: true,
    req,
    where,
  })
  const docs = found.docs as Doc[]

  const byStatus: Record<string, number> = { new: 0, read: 0, replied: 0 }
  for (const d of docs) {
    const st = String(d.status ?? 'new')
    byStatus[st] = (byStatus[st] ?? 0) + 1
  }
  const total = docs.length
  const perDay = days ? (total / days).toFixed(1) : null

  let recent = docs
  if (statusFilter) recent = recent.filter((d) => String(d.status) === statusFilter)
  recent = recent.slice(0, 25)

  const kpis: { label: string; value: string | number; color?: string }[] = [
    { label: 'Total', value: total },
    { label: 'New', value: byStatus.new, color: STATUS_COLOR.new },
    { label: 'Read', value: byStatus.read, color: STATUS_COLOR.read },
    { label: 'Replied', value: byStatus.replied, color: STATUS_COLOR.replied },
  ]
  if (perDay) kpis.push({ label: 'Per day', value: perDay })

  const adminRoute = payload.config.routes.admin
  const editHref = (id: unknown) => `${adminRoute}/collections/${MESSAGES_SLUG}/${id}`

  const card: React.CSSProperties = {
    border: '1px solid var(--theme-elevation-150)',
    borderRadius: 'var(--style-radius-m, 6px)',
    background: 'var(--theme-elevation-50)',
    padding: '16px 18px',
  }
  const th: React.CSSProperties = {
    textAlign: 'left',
    padding: '8px 12px',
    borderBottom: '1px solid var(--theme-elevation-150)',
    color: 'var(--theme-elevation-500)',
    fontSize: 12,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  }
  const td: React.CSSProperties = {
    padding: '8px 12px',
    borderBottom: '1px solid var(--theme-elevation-100)',
    fontSize: 13,
    verticalAlign: 'top',
  }
  const selectStyle: React.CSSProperties = {
    padding: '6px 10px',
    borderRadius: 4,
    border: '1px solid var(--theme-elevation-200)',
    background: 'var(--theme-input-bg, var(--theme-elevation-0))',
    color: 'var(--theme-text)',
    fontSize: 13,
  }
  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 11, color: 'var(--theme-elevation-500)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </span>
      {children}
    </label>
  )

  return (
    <DefaultTemplate
      i18n={req.i18n}
      locale={initPageResult.locale}
      params={params}
      payload={payload}
      permissions={initPageResult.permissions}
      searchParams={searchParams}
      user={req.user ?? undefined}
      visibleEntities={visibleEntities}
    >
      <div className="gutter--left gutter--right" style={{ paddingTop: 24, paddingBottom: 48 }}>
        <h1 style={{ margin: '0 0 4px' }}>Contact Inbox</h1>
        <p style={{ margin: '0 0 24px', color: 'var(--theme-elevation-500)' }}>
          {since ? `Messages received in the last ${days} days` : 'All messages, all time'}
        </p>

        <form method="get" style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'flex-end', marginBottom: 28 }}>
          <Field label="Status (table)">
            <select name="status" defaultValue={statusFilter ?? 'all'} style={selectStyle}>
              <option value="all">All statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Period">
            <select name="period" defaultValue={period} style={selectStyle}>
              <option value="all">All time</option>
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </select>
          </Field>
          <button type="submit" className="btn btn--style-primary btn--size-small" style={{ margin: 0 }}>
            Apply
          </button>
        </form>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 14, marginBottom: 28 }}>
          {kpis.map((k) => (
            <div key={k.label} style={card}>
              <div style={{ fontSize: 12, color: 'var(--theme-elevation-500)', marginBottom: 6 }}>{k.label}</div>
              <div style={{ fontSize: 30, fontWeight: 700, lineHeight: 1, color: k.color ?? 'var(--theme-text)' }}>{k.value}</div>
            </div>
          ))}
        </div>

        <div style={card}>
          <h3 style={{ margin: '0 0 12px' }}>Recent messages{statusFilter ? ` · ${statusFilter}` : ''}</h3>
          {recent.length === 0 ? (
            <p style={{ color: 'var(--theme-elevation-400)', margin: 0 }}>No messages yet.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={th}>From</th>
                  <th style={th}>Subject</th>
                  <th style={th}>Message</th>
                  <th style={th}>Status</th>
                  <th style={th}>Date</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((d) => {
                  const st = String(d.status ?? 'new') as Status
                  return (
                    <tr key={String(d.id)}>
                      <td style={td}>
                        <a href={editHref(d.id)} style={{ color: 'var(--theme-text)', fontWeight: 600 }}>
                          {String(d.name ?? '—')}
                        </a>
                        <div style={{ color: 'var(--theme-elevation-500)', fontSize: 12 }}>{String(d.email ?? '')}</div>
                      </td>
                      <td style={td}>{snippet(d.subject, 40) || '—'}</td>
                      <td style={{ ...td, maxWidth: 380 }}>{snippet(d.message)}</td>
                      <td style={td}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: 999,
                            fontSize: 11,
                            fontWeight: 600,
                            color: '#fff',
                            background: STATUS_COLOR[st] ?? '#9ca3af',
                          }}
                        >
                          {st}
                        </span>
                      </td>
                      <td style={{ ...td, whiteSpace: 'nowrap', color: 'var(--theme-elevation-500)' }}>
                        {d.createdAt ? new Date(String(d.createdAt)).toLocaleDateString() : ''}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </DefaultTemplate>
  )
}

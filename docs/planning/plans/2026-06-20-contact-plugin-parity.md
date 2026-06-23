# Contact Plugin Parity Implementation Plan

> Implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring `@navanem/payload-contact` to structural parity with `@navanem/payload-comments` by adding a dev environment, a vitest test suite, detailed docs, and pnpm tooling — without changing `src/`.

**Architecture:** Add tooling files (vitest, .npmrc, pnpm-workspace, tsconfig.dev), a sqlite-backed `dev/` Payload app, three `docs/` guides, and unit tests that exercise the existing pure/server logic through a fake `payload` object (no DB boot). The existing `tsc` distribution build is left untouched.

**Tech Stack:** TypeScript (ESM, NodeNext), Payload 3.x, `@payloadcms/db-sqlite`, vitest 2.1, pnpm.

## Global Constraints

- Do **not** modify any file under `src/` except `src/` is read-only here. If a test fails because of a real bug in `src/`, stop and report it to the maintainer rather than editing `src/` or weakening the test.
- ESM imports inside the project use the `.js` extension on relative paths (e.g. `../src/index.js`), matching the existing `src/` style.
- Package manager: **pnpm**. Use `pnpm` for install/test/dev commands.
- Mirror `comments` conventions exactly where a counterpart exists (vitest config, `.npmrc`, `pnpm-workspace.yaml`, `tsconfig.dev.json`, `dev/` shape).
- Node floor `>=18.20.0`; vitest `^2.1.0`; `@payloadcms/db-sqlite` `^3.0.0`.
- No SMTP/email dependency is introduced.
- Commit after every task with a conventional-commit message.

---

### Task 1: Tooling + first passing test (defaults)

**Files:**
- Modify: `package.json` (add `scripts.dev/test/test:watch`, add two devDeps)
- Create: `vitest.config.ts`
- Create: `.npmrc`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.dev.json`
- Test: `tests/defaults.test.ts`

**Interfaces:**
- Consumes: `resolveOptions`, `DEFAULT_SUCCESS_MESSAGE` from `../src/defaults.js`; `ResolvedOptions` type from `../src/types.js`.
- Produces: a working `pnpm test` command (so later tasks only add `tests/*.test.ts` files).

- [ ] **Step 1: Add scripts and devDeps to `package.json`**

In `package.json`, change the `scripts` block to:

```json
  "scripts": {
    "build": "tsc -p tsconfig.json && node scripts/copy-assets.mjs",
    "clean": "rimraf dist",
    "dev": "payload dev",
    "test": "vitest run",
    "test:watch": "vitest"
  },
```

In `devDependencies`, add these two entries (keep the existing ones, alphabetical order):

```json
    "@payloadcms/db-sqlite": "^3.0.0",
    "vitest": "^2.1.0",
```

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    testTimeout: 60000,
    hookTimeout: 60000,
    fileParallelism: false,
  },
})
```

- [ ] **Step 3: Create `.npmrc`**

```
approve-builds=false
```

- [ ] **Step 4: Create `pnpm-workspace.yaml`**

```yaml
onlyBuiltDependencies:
  - esbuild
  - sharp
```

- [ ] **Step 5: Create `tsconfig.dev.json`**

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "noEmit": true,
    "rootDir": "."
  },
  "include": ["src", "dev", "tests"],
  "exclude": ["dist", "node_modules"]
}
```

- [ ] **Step 6: Install dependencies**

Run: `pnpm install`
Expected: completes without error; `node_modules/vitest` and `node_modules/@payloadcms/db-sqlite` exist.

- [ ] **Step 7: Write the defaults test**

Create `tests/defaults.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { resolveOptions, DEFAULT_SUCCESS_MESSAGE } from '../src/defaults.js'

describe('resolveOptions', () => {
  const saved = { ...process.env }
  beforeEach(() => {
    delete process.env.CONTACT_IP_SALT
    delete process.env.COMMENTS_IP_SALT
  })
  afterEach(() => {
    process.env = { ...saved }
  })

  it('applies defaults when no options are given', () => {
    const o = resolveOptions()
    expect(o.enabled).toBe(true)
    expect(o.minLength).toBe(10)
    expect(o.maxLength).toBe(5000)
    expect(o.requireSubject).toBe(false)
    expect(o.blockedKeywords).toEqual([])
    expect(o.notificationEmail).toBe('')
    expect(o.successMessage).toBe(DEFAULT_SUCCESS_MESSAGE)
    expect(o.rateLimit).toEqual({ windowMs: 60_000, max: 3 })
    expect(o.messagesSlug).toBe('contact-messages')
    expect(o.disabled).toBe(false)
    expect(o.ipSalt).toBe('navanem-contact-salt')
  })

  it('respects explicit overrides', () => {
    const o = resolveOptions({
      minLength: 5,
      maxLength: 100,
      requireSubject: true,
      blockedKeywords: ['casino'],
      messagesSlug: 'inbox',
      rateLimit: { windowMs: 1000, max: 1 },
    })
    expect(o.minLength).toBe(5)
    expect(o.maxLength).toBe(100)
    expect(o.requireSubject).toBe(true)
    expect(o.blockedKeywords).toEqual(['casino'])
    expect(o.messagesSlug).toBe('inbox')
    expect(o.rateLimit).toEqual({ windowMs: 1000, max: 1 })
  })

  it('resolves ipSalt: option > CONTACT_IP_SALT > COMMENTS_IP_SALT > default', () => {
    expect(resolveOptions({ ipSalt: 'opt' }).ipSalt).toBe('opt')
    process.env.CONTACT_IP_SALT = 'contact-env'
    expect(resolveOptions().ipSalt).toBe('contact-env')
    delete process.env.CONTACT_IP_SALT
    process.env.COMMENTS_IP_SALT = 'comments-env'
    expect(resolveOptions().ipSalt).toBe('comments-env')
  })
})
```

- [ ] **Step 8: Run the test**

Run: `pnpm test`
Expected: PASS (3 tests in `tests/defaults.test.ts`). If the `ipSalt` test fails because another env var is set in your shell, that is an environment issue, not a code bug — clear it and re-run.

- [ ] **Step 9: Commit**

```bash
git add package.json pnpm-lock.yaml vitest.config.ts .npmrc pnpm-workspace.yaml tsconfig.dev.json tests/defaults.test.ts
git commit -m "chore: add vitest tooling and defaults tests"
```

---

### Task 2: Rate limiter + IP hashing tests

**Files:**
- Test: `tests/utils.rateLimit.test.ts`

**Interfaces:**
- Consumes: `createRateLimiter`, `hashIp` from `../src/utils/rateLimit.js`. `createRateLimiter({ windowMs, max })` returns `{ check(key: string): boolean }`. `hashIp(headers: Headers, salt: string): string` returns a 32-char hex string.
- Note: contact's `createRateLimiter` reads `Date.now()` directly (no injectable clock), so the window-reset test uses vitest fake timers.

- [ ] **Step 1: Write the test**

Create `tests/utils.rateLimit.test.ts`:

```ts
import { describe, it, expect, vi, afterEach } from 'vitest'
import { createRateLimiter, hashIp } from '../src/utils/rateLimit.js'

describe('createRateLimiter', () => {
  afterEach(() => vi.useRealTimers())

  it('allows up to max in the window then blocks', () => {
    const limiter = createRateLimiter({ windowMs: 1000, max: 2 })
    expect(limiter.check('k')).toBe(true)
    expect(limiter.check('k')).toBe(true)
    expect(limiter.check('k')).toBe(false)
  })

  it('tracks keys independently', () => {
    const limiter = createRateLimiter({ windowMs: 1000, max: 1 })
    expect(limiter.check('a')).toBe(true)
    expect(limiter.check('b')).toBe(true)
    expect(limiter.check('a')).toBe(false)
  })

  it('resets after the window elapses', () => {
    vi.useFakeTimers()
    vi.setSystemTime(1000)
    const limiter = createRateLimiter({ windowMs: 1000, max: 1 })
    expect(limiter.check('k')).toBe(true)
    expect(limiter.check('k')).toBe(false)
    vi.setSystemTime(2500)
    expect(limiter.check('k')).toBe(true)
  })
})

describe('hashIp', () => {
  it('is deterministic for the same ip + salt', () => {
    const h = new Headers({ 'x-forwarded-for': '1.2.3.4' })
    expect(hashIp(h, 'salt')).toBe(hashIp(new Headers({ 'x-forwarded-for': '1.2.3.4' }), 'salt'))
  })

  it('changes with the salt', () => {
    const h = () => new Headers({ 'x-forwarded-for': '1.2.3.4' })
    expect(hashIp(h(), 'salt-a')).not.toBe(hashIp(h(), 'salt-b'))
  })

  it('returns a 32-char hex digest', () => {
    const out = hashIp(new Headers({ 'x-forwarded-for': '1.2.3.4' }), 'salt')
    expect(out).toMatch(/^[0-9a-f]{32}$/)
  })

  it('uses the first x-forwarded-for ip', () => {
    const a = hashIp(new Headers({ 'x-forwarded-for': '1.2.3.4, 9.9.9.9' }), 'salt')
    const b = hashIp(new Headers({ 'x-forwarded-for': '1.2.3.4' }), 'salt')
    expect(a).toBe(b)
  })

  it('falls back to x-real-ip then "unknown"', () => {
    const real = hashIp(new Headers({ 'x-real-ip': '5.6.7.8' }), 'salt')
    expect(real).toBe(hashIp(new Headers({ 'x-real-ip': '5.6.7.8' }), 'salt'))
    const none = hashIp(new Headers(), 'salt')
    expect(none).toBe(hashIp(new Headers(), 'salt'))
    expect(real).not.toBe(none)
  })
})
```

- [ ] **Step 2: Run the test**

Run: `pnpm exec vitest run tests/utils.rateLimit.test.ts`
Expected: PASS (all cases). If `resets after the window elapses` fails, the limiter is not honoring `windowMs` — stop and report a possible `src/` bug (do not edit `src/`).

- [ ] **Step 3: Commit**

```bash
git add tests/utils.rateLimit.test.ts
git commit -m "test: cover rate limiter and ip hashing"
```

---

### Task 3: Fake payload helper + submitContact tests

**Files:**
- Create: `tests/helpers/fakePayload.ts`
- Test: `tests/services.submitContact.test.ts`

**Interfaces:**
- Consumes: `submitContact` from `../src/services/submitContact.js`; `resolveOptions` from `../src/defaults.js`.
- Produces: `makeFakePayload(opts?)` from `tests/helpers/fakePayload.ts`, returning `{ payload, created }` where `created` is an array of `{ collection, data }` captured from `payload.create`, and `findGlobal` resolves to `opts.global` (default `{}`) or throws when `opts.throwOnGlobal` is true. This helper is reused by Task 4.

- [ ] **Step 1: Write the fake payload helper**

Create `tests/helpers/fakePayload.ts`:

```ts
import type { Payload } from 'payload'

export interface FakePayloadOptions {
  /** Object returned by findGlobal (the saved Contact Settings global). */
  global?: Record<string, unknown>
  /** When true, findGlobal throws (simulates a missing table / fail-open path). */
  throwOnGlobal?: boolean
}

export interface CreatedDoc {
  collection: string
  data: Record<string, unknown>
}

export function makeFakePayload(opts: FakePayloadOptions = {}): {
  payload: Payload
  created: CreatedDoc[]
} {
  const created: CreatedDoc[] = []
  const payload = {
    async findGlobal() {
      if (opts.throwOnGlobal) throw new Error('no such table')
      return opts.global ?? {}
    },
    async create(args: { collection: string; data: Record<string, unknown> }) {
      created.push({ collection: args.collection, data: args.data })
      return { id: 'fake-id', ...args.data }
    },
  }
  return { payload: payload as unknown as Payload, created }
}
```

- [ ] **Step 2: Write the submitContact test**

Create `tests/services.submitContact.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { submitContact } from '../src/services/submitContact.js'
import { resolveOptions } from '../src/defaults.js'
import { makeFakePayload } from './helpers/fakePayload.js'

const validInput = {
  name: 'Ada',
  email: 'ada@example.com',
  message: 'This is a long enough message.',
}

describe('submitContact', () => {
  it('silently drops honeypot hits without storing', async () => {
    const { payload, created } = makeFakePayload()
    const res = await submitContact(payload, resolveOptions(), { ...validInput, honeypot: 'bot' })
    expect(res).toEqual({ ok: true, dropped: true })
    expect(created).toHaveLength(0)
  })

  it('rejects with 403 when the form is closed', async () => {
    const { payload, created } = makeFakePayload({ global: { enabled: false } })
    const res = await submitContact(payload, resolveOptions(), validInput)
    expect(res).toEqual({ ok: false, status: 403, error: expect.any(String) })
    expect(created).toHaveLength(0)
  })

  it('rejects 400 on missing fields', async () => {
    const { payload } = makeFakePayload()
    const res = await submitContact(payload, resolveOptions(), { name: '', email: '', message: '' })
    expect(res).toMatchObject({ ok: false, status: 400 })
  })

  it('rejects 400 on invalid email', async () => {
    const { payload } = makeFakePayload()
    const res = await submitContact(payload, resolveOptions(), { ...validInput, email: 'not-an-email' })
    expect(res).toMatchObject({ ok: false, status: 400 })
  })

  it('rejects 400 when the message is too short', async () => {
    const { payload } = makeFakePayload()
    const res = await submitContact(payload, resolveOptions({ minLength: 10 }), { ...validInput, message: 'hi' })
    expect(res).toMatchObject({ ok: false, status: 400 })
  })

  it('rejects 400 when requireSubject is on and subject is missing', async () => {
    const { payload } = makeFakePayload()
    const res = await submitContact(payload, resolveOptions({ requireSubject: true }), validInput)
    expect(res).toMatchObject({ ok: false, status: 400 })
  })

  it('drops blocked-keyword spam without storing', async () => {
    const { payload, created } = makeFakePayload()
    const res = await submitContact(payload, resolveOptions({ blockedKeywords: ['casino'] }), {
      ...validInput,
      message: 'Best CASINO bonus, click here now.',
    })
    expect(res).toEqual({ ok: true, dropped: true })
    expect(created).toHaveLength(0)
  })

  it('stores a valid submission with status "new"', async () => {
    const { payload, created } = makeFakePayload()
    const res = await submitContact(payload, resolveOptions(), {
      ...validInput,
      subject: 'Hello',
    })
    expect(res).toEqual({ ok: true })
    expect(created).toHaveLength(1)
    expect(created[0].collection).toBe('contact-messages')
    expect(created[0].data).toMatchObject({
      name: 'Ada',
      email: 'ada@example.com',
      subject: 'Hello',
      message: 'This is a long enough message.',
      status: 'new',
    })
  })
})
```

- [ ] **Step 3: Run the test**

Run: `pnpm exec vitest run tests/services.submitContact.test.ts`
Expected: PASS (8 cases). Any failure here may indicate a real `src/` behavior change — stop and report rather than editing `src/`.

- [ ] **Step 4: Commit**

```bash
git add tests/helpers/fakePayload.ts tests/services.submitContact.test.ts
git commit -m "test: cover submitContact paths with a fake payload"
```

---

### Task 4: getContactSettings / readPublicContactSettings tests

**Files:**
- Test: `tests/utils.getSettings.test.ts`

**Interfaces:**
- Consumes: `getContactSettings`, `readPublicContactSettings` from `../src/utils/getSettings.js`; `DEFAULT_SUCCESS_MESSAGE`, `resolveOptions` from `../src/defaults.js`; `makeFakePayload` from `./helpers/fakePayload.js` (defined in Task 3).

- [ ] **Step 1: Write the test**

Create `tests/utils.getSettings.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { getContactSettings, readPublicContactSettings } from '../src/utils/getSettings.js'
import { resolveOptions, DEFAULT_SUCCESS_MESSAGE } from '../src/defaults.js'
import { makeFakePayload } from './helpers/fakePayload.js'

describe('getContactSettings', () => {
  it('reads values from the saved global and parses keywords', async () => {
    const { payload } = makeFakePayload({
      global: {
        enabled: false,
        minLength: 20,
        maxLength: 999,
        requireSubject: true,
        blockedKeywords: 'Spam, Casino\nWin',
        successMessage: 'Got it!',
      },
    })
    const s = await getContactSettings(payload, resolveOptions())
    expect(s).toEqual({
      enabled: false,
      minLength: 20,
      maxLength: 999,
      requireSubject: true,
      blockedKeywords: ['spam', 'casino', 'win'],
      successMessage: 'Got it!',
    })
  })

  it('falls back to options for wrong-typed global fields', async () => {
    const { payload } = makeFakePayload({
      global: { enabled: 'yes', minLength: '5', successMessage: '' },
    })
    const opts = resolveOptions({ minLength: 7, blockedKeywords: ['X'] })
    const s = await getContactSettings(payload, opts)
    expect(s.enabled).toBe(opts.enabled)
    expect(s.minLength).toBe(7)
    expect(s.successMessage).toBe(opts.successMessage)
    expect(s.blockedKeywords).toEqual(['x'])
  })

  it('fails open to options when findGlobal throws', async () => {
    const { payload } = makeFakePayload({ throwOnGlobal: true })
    const opts = resolveOptions({ minLength: 42 })
    const s = await getContactSettings(payload, opts)
    expect(s.minLength).toBe(42)
    expect(s.enabled).toBe(true)
  })
})

describe('readPublicContactSettings', () => {
  it('returns enabled + successMessage from the global', async () => {
    const { payload } = makeFakePayload({ global: { enabled: false, successMessage: 'Hi there' } })
    expect(await readPublicContactSettings(payload)).toEqual({ enabled: false, successMessage: 'Hi there' })
  })

  it('returns defaults when findGlobal throws', async () => {
    const { payload } = makeFakePayload({ throwOnGlobal: true })
    expect(await readPublicContactSettings(payload)).toEqual({
      enabled: true,
      successMessage: DEFAULT_SUCCESS_MESSAGE,
    })
  })
})
```

- [ ] **Step 2: Run the full suite**

Run: `pnpm test`
Expected: PASS — all four test files (defaults, rateLimit, submitContact, getSettings) green.

- [ ] **Step 3: Commit**

```bash
git add tests/utils.getSettings.test.ts
git commit -m "test: cover contact settings resolution and fail-open"
```

---

### Task 5: Dev environment (sqlite Payload app)

**Files:**
- Create: `dev/payload.config.ts`
- Create: `dev/collections/Users.ts`

**Interfaces:**
- Consumes: `contactPlugin` from `../src/index.js`.
- Note: `dev/` is excluded from the distribution build (`tsconfig.json` builds `src` only). It is typechecked via `tsconfig.dev.json` (Task 1). `dev/contact.db` and `dev/payload-types.ts` are generated at runtime — add them to `.gitignore` in Step 3.

- [ ] **Step 1: Create the Users collection**

Create `dev/collections/Users.ts`:

```ts
import type { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',
  auth: true,
  admin: { useAsTitle: 'email' },
  fields: [],
}
```

- [ ] **Step 2: Create the dev Payload config**

Create `dev/payload.config.ts`:

```ts
import { buildConfig } from 'payload'
import { sqliteAdapter } from '@payloadcms/db-sqlite'
import path from 'path'
import { fileURLToPath } from 'url'
import { Users } from './collections/Users.js'
import { contactPlugin } from '../src/index.js'

const dirname = path.dirname(fileURLToPath(import.meta.url))

export default buildConfig({
  secret: 'test-secret',
  admin: { user: 'users' },
  collections: [Users],
  db: sqliteAdapter({
    client: { url: process.env.DATABASE_URI || `file:${path.resolve(dirname, 'contact.db')}` },
    // Auto-create tables without migration files (dev-style schema push).
    push: true,
  }),
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
  plugins: [
    contactPlugin({
      requireSubject: true,
      blockedKeywords: ['casino'],
    }),
  ],
})
```

- [ ] **Step 3: Ignore generated dev artifacts**

Append to `.gitignore` (if these lines are not already present):

```
# dev environment
dev/contact.db
dev/payload-types.ts
```

- [ ] **Step 4: Typecheck the dev environment**

Run: `pnpm exec tsc -p tsconfig.dev.json`
Expected: no output, exit code 0 (clean typecheck of `src` + `dev` + `tests`).

If `payload dev` requires a Next app to boot in your environment, that is a known caveat (noted in the spec): the typecheck above is the required green gate for this task; do not scaffold a Next app unless `comments`' `dev/` has one.

- [ ] **Step 5: Commit**

```bash
git add dev/payload.config.ts dev/collections/Users.ts .gitignore
git commit -m "chore: add sqlite dev environment for the contact plugin"
```

---

### Task 6: Documentation + README/CHANGELOG

**Files:**
- Create: `docs/configuration.md`
- Create: `docs/frontend-integration.md`
- Create: `docs/inbox-and-triage.md`
- Modify: `README.md` (add Development, Testing, and Docs links)
- Modify: `CHANGELOG.md` (add an entry)

**Interfaces:**
- Consumes: nothing in code. Content must match the real plugin API as defined in `src/types.ts`, `src/defaults.ts`, `src/components/ContactForm.tsx`, `src/endpoints/submitEndpoint.ts`, and `src/utils/getSettings.ts`.

- [ ] **Step 1: Write `docs/configuration.md`**

```markdown
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
| `notificationEmail` | `string` | `''` | no | Stored only; no email is sent without an adapter. |
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

## Environment variables

- `CONTACT_IP_SALT` — salt used to hash visitor IPs in the rate limiter.
- `COMMENTS_IP_SALT` — used as a fallback if `CONTACT_IP_SALT` is unset (shared with the
  sibling comments plugin).

Resolution order for the salt: `options.ipSalt` → `CONTACT_IP_SALT` → `COMMENTS_IP_SALT`
→ a built-in default (`navanem-contact-salt`). Set one in production.
```

- [ ] **Step 2: Write `docs/frontend-integration.md`**

```markdown
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
```

- [ ] **Step 3: Write `docs/inbox-and-triage.md`**

```markdown
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
```

- [ ] **Step 4: Add Development, Testing, and Docs sections to `README.md`**

Insert this block immediately before the `## License` section of `README.md`:

```markdown
## Development

```bash
pnpm install
pnpm dev          # boots a sqlite-backed Payload admin with the plugin registered
```

The dev environment lives in `dev/` (sqlite, schema auto-push — no migrations needed).

## Testing

```bash
pnpm test         # run the vitest suite once
pnpm test:watch   # watch mode
```

Tests live in `tests/` and exercise the plugin's pure and server logic through a fake
`payload` object — no database is required to run them.

## Documentation

- [`docs/configuration.md`](docs/configuration.md) — plugin options, runtime settings, env vars
- [`docs/frontend-integration.md`](docs/frontend-integration.md) — `<ContactForm/>`, endpoint, theming
- [`docs/inbox-and-triage.md`](docs/inbox-and-triage.md) — the inbox, statuses, email notifications

```

- [ ] **Step 5: Add a CHANGELOG entry**

Add this entry at the top of the changelog list in `CHANGELOG.md` (keep the existing
format/heading style of the file; adjust the version heading to match the file's
convention):

```markdown
## [Unreleased]

### Added
- Dev environment (`dev/`) with a sqlite-backed Payload app for local testing.
- Vitest test suite (`tests/`) covering defaults, rate limiting/IP hashing,
  `submitContact`, and contact-settings resolution.
- Documentation guides under `docs/` (configuration, frontend integration, inbox & triage).
- pnpm tooling: `.npmrc`, `pnpm-workspace.yaml`, `tsconfig.dev.json`, and
  `dev`/`test`/`test:watch` scripts.
```

- [ ] **Step 6: Verify the build still passes and docs render**

Run: `pnpm build`
Expected: `tsc` + copy-assets complete with exit code 0 (the distribution build is
unchanged — `dev/` and `tests/` are not part of it).

- [ ] **Step 7: Commit**

```bash
git add docs/ README.md CHANGELOG.md
git commit -m "docs: add configuration, frontend, and inbox guides; dev/test instructions"
```

---

## Self-Review notes

- **Spec coverage:** Tooling (Task 1) ✓, dev/ env (Task 5) ✓, docs ×3 (Task 6) ✓,
  tests defaults/rateLimit/submitContact/getSettings (Tasks 1–4) ✓, README/CHANGELOG
  (Task 6) ✓. Success criteria 1–5 each map to a task gate.
- **No-src-change constraint:** preserved; the rate-limiter window test uses vitest fake
  timers instead of an injected clock, and every task instructs to report rather than
  edit `src/` on failure.
- **Type consistency:** `makeFakePayload(opts?) -> { payload, created }` is defined in
  Task 3 and consumed unchanged in Task 4; `resolveOptions`/`getContactSettings`
  signatures match `src/`.
- **Open risk:** `payload dev` may need a Next app; Task 5's required gate is the
  `tsconfig.dev.json` typecheck, with `pnpm dev` as a best-effort convenience.
```

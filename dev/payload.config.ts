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

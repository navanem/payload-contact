import type { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',
  auth: true,
  // GHSA-jg8r-5jh2-v2xj: the dev fixture has no privileged unlock role.
  access: { unlock: () => false },
  admin: { useAsTitle: 'email' },
  fields: [],
}

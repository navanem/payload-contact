import { describe, it, expect } from 'vitest'
import { executeAccess, type PayloadRequest } from 'payload'
import { Users } from '../dev/collections/Users.js'

describe('development account-unlock access', () => {
  it.each([
    { role: 'anonymous', user: null },
    { role: 'authenticated', user: { id: 'attacker', collection: 'users' } },
  ])('rejects $role attempts to unlock another account', async ({ user }) => {
    const req = { user, t: (key: string) => key } as unknown as PayloadRequest
    const unlock = Users.access?.unlock
    if (!unlock) throw new Error('Account unlocking must have an explicit access rule')
    await expect(
      executeAccess({ req }, unlock),
    ).rejects.toMatchObject({ status: 403 })
  })
})

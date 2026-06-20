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

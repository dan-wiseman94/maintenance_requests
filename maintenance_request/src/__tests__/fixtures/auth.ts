import { vi } from 'vitest'
import type { User } from '@/types'

export const admin: User = {
  id: 3,
  email: 'admin@test.local',
  firstName: 'Ada',
  lastName: 'Admin',
  address: '3 Test St',
  userRole: 'Admin',
}
export const tenant: User = {
  id: 1,
  email: 'tenant@test.local',
  firstName: 'Terry',
  lastName: 'Tenant',
  address: '1 Test St',
  userRole: 'Tenant',
}

type Stub = { url: string; status?: number; body?: unknown }

/** Stub global fetch. The first entry whose url is a prefix of the request wins; unmatched requests get a 404. */
export function stubFetch(stubs: Stub[]) {
  const fetchMock = vi.fn<typeof fetch>(async (input) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    const hit = stubs.find((s) => url.startsWith(s.url))
    const status = hit?.status ?? (hit ? 200 : 404)
    return { ok: status < 400, status, json: async () => hit?.body } as Response
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

export const emptyPage = { items: [], page: 1, pageSize: 20, totalCount: 0 }

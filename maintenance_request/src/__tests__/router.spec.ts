import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, type Router } from 'vue-router'
import { createAppRouter } from '@/router'
import { useAuthStore } from '@/stores/auth'
import { admin, tenant, stubFetch, emptyPage } from './fixtures/auth'

// The views mount lazily on navigation; give them an empty page to render.
const data = [
  { url: '/api/User', body: emptyPage },
  { url: '/api/MaintenanceRequest', body: emptyPage },
]

describe('router guard', () => {
  // A fresh router per test. Vue Router treats a push to the location it is already on
  // as a duplicated navigation and never runs the guards, so sharing one router across
  // tests would let the previous test's position decide whether the guard runs at all.
  let router: Router
  beforeEach(() => {
    setActivePinia(createPinia())
    router = createAppRouter(createMemoryHistory())
  })
  afterEach(() => vi.unstubAllGlobals())

  it('sends a signed-out visitor to login and remembers where they were going', async () => {
    stubFetch([{ url: '/api/Auth/me', status: 401 }])
    await router.push('/users')
    expect(router.currentRoute.value.name).toBe('login')
    expect(router.currentRoute.value.query.redirect).toBe('/users')
  })

  it('lets an admin reach /users', async () => {
    stubFetch([{ url: '/api/Auth/me', body: admin }, ...data])
    await router.push('/users')
    expect(router.currentRoute.value.name).toBe('users')
  })

  it('bounces a tenant from /users to /requests', async () => {
    stubFetch([{ url: '/api/Auth/me', body: tenant }, ...data])
    await router.push('/users')
    expect(router.currentRoute.value.name).toBe('requests')
  })

  it('keeps a signed-in user off the login page', async () => {
    stubFetch([{ url: '/api/Auth/me', body: tenant }, ...data])
    await router.push('/login')
    expect(router.currentRoute.value.name).toBe('requests')
  })

  it('asks /me only once per session', async () => {
    const fetchMock = stubFetch([{ url: '/api/Auth/me', body: tenant }, ...data])
    await router.push('/requests')
    await router.push('/login')
    const meCalls = fetchMock.mock.calls.filter(([u]) => String(u).startsWith('/api/Auth/me'))
    expect(meCalls).toHaveLength(1)
    expect(useAuthStore().ready).toBe(true)
  })
})

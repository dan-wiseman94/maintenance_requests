import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import { admin, stubFetch } from './fixtures/auth'

describe('auth store', () => {
  beforeEach(() => setActivePinia(createPinia()))
  afterEach(() => vi.unstubAllGlobals())

  it('fetchMe sets the user on 200 and marks ready', async () => {
    stubFetch([{ url: '/api/Auth/me', body: admin }])
    const auth = useAuthStore()
    expect(auth.ready).toBe(false)

    await auth.fetchMe()

    expect(auth.ready).toBe(true)
    expect(auth.user).toEqual(admin)
    expect(auth.isAdmin).toBe(true)
  })

  it('fetchMe leaves the user null on 401 but still marks ready', async () => {
    stubFetch([{ url: '/api/Auth/me', status: 401 }])
    const auth = useAuthStore()
    await auth.fetchMe()
    expect(auth.ready).toBe(true)
    expect(auth.isAuthenticated).toBe(false)
  })

  it('login POSTs credentials and stores the returned user', async () => {
    const fetchMock = stubFetch([{ url: '/api/Auth/login', body: admin }])
    const auth = useAuthStore()

    await auth.login('admin@test.local', 'pw')

    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('/api/Auth/login')
    expect(JSON.parse(String((init as RequestInit).body))).toEqual({
      email: 'admin@test.local',
      password: 'pw',
    })
    expect(auth.user).toEqual(admin)
  })

  it('login throws the friendly message on 401 and stays signed out', async () => {
    stubFetch([{ url: '/api/Auth/login', status: 401 }])
    const auth = useAuthStore()
    await expect(auth.login('x@y.z', 'bad')).rejects.toThrow('Email or password is incorrect.')
    expect(auth.isAuthenticated).toBe(false)
  })

  it('logout clears the user even when the request fails', async () => {
    stubFetch([{ url: '/api/Auth/logout', status: 500 }])
    const auth = useAuthStore()
    auth.user = admin
    await auth.logout()
    expect(auth.user).toBeNull()
  })
})

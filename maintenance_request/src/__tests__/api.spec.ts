import { describe, it, expect, afterEach, vi } from 'vitest'
import { apiFetch, onUnauthorized } from '@/lib/api'

describe('apiFetch', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('notifies listeners on 401 and returns the response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }))
    const listener = vi.fn()
    const off = onUnauthorized(listener)

    const response = await apiFetch('/api/User')

    expect(response.status).toBe(401)
    expect(listener).toHaveBeenCalledTimes(1)
    off()
  })

  it('stays quiet on other statuses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }))
    const listener = vi.fn()
    const off = onUnauthorized(listener)
    await apiFetch('/api/User')
    expect(listener).not.toHaveBeenCalled()
    off()
  })
})

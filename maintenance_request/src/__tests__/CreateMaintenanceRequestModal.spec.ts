import { describe, it, expect, vi, afterEach } from 'vitest'

import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import CreateMaintenanceRequestModal from '@/components/CreateMaintenanceRequestModal.vue'
import { useAuthStore } from '@/stores/auth'
import { admin, tenant } from './fixtures/auth'
import type { PagedResult, User } from '@/types'

const usersBody: PagedResult<User> = {
  items: [
    {
      id: 4,
      firstName: 'Alice',
      lastName: 'Smith',
      address: '1 Main St',
      userRole: 'Tenant',
      email: 'alice@test.local',
    },
    {
      id: 9,
      firstName: 'Bob',
      lastName: 'Jones',
      address: '2 Main St',
      userRole: 'Admin',
      email: 'bob@test.local',
    },
  ],
  page: 1,
  pageSize: 100,
  totalCount: 2,
}

const jsonResponse = (body: unknown) =>
  ({
    ok: true,
    json: vi.fn<() => Promise<unknown>>().mockResolvedValue(body),
  }) as unknown as Response

// Mounts the modal closed, signed in as `user`. The session must be in place before
// `open` flips, because the open watcher reads auth.isAdmin to decide whether to load users.
const mountAs = (user: User) => {
  const pinia = createPinia()
  setActivePinia(pinia)
  useAuthStore().user = user
  return mount(CreateMaintenanceRequestModal, {
    attachTo: document.body,
    props: { open: false },
    global: { plugins: [pinia] },
  })
}

describe('CreateMaintenanceRequestModal', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('as an admin, loads users into the picker when opened', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(usersBody))
    vi.stubGlobal('fetch', fetchMock)

    const wrapper = mountAs(admin)
    expect(fetchMock).not.toHaveBeenCalled()

    await wrapper.setProps({ open: true })
    await flushPromises()

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/User?page=1&pageSize=100&orderBy=lastName&desc=false',
    )
    const options = wrapper.findAll('#create-request-createdBy option').map((o) => o.text())
    expect(options).toEqual([
      'Select a tenant',
      'Smith, Alice — alice@test.local',
      'Jones, Bob — bob@test.local',
    ])

    wrapper.unmount()
  })

  it('as a tenant, hides the picker and never asks for users', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(usersBody))
    vi.stubGlobal('fetch', fetchMock)

    const wrapper = mountAs(tenant)
    await wrapper.setProps({ open: true })
    await flushPromises()

    expect(fetchMock).not.toHaveBeenCalled()
    expect(wrapper.find('#create-request-createdBy').exists()).toBe(false)

    wrapper.unmount()
  })

  it('as an admin, POSTs a numeric createdBy and the status enum name, then emits created', async () => {
    const created = {
      id: 12,
      location: 'Roof',
      maintenanceType: 'Plumbing',
      createdAt: '2026-09-13T00:00:00Z',
      createdBy: 9,
      createdByName: 'Bob Jones',
      requestStatus: 'InProgress',
    }
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse(usersBody))
      .mockResolvedValueOnce(jsonResponse(created))
    vi.stubGlobal('fetch', fetchMock)

    const wrapper = mountAs(admin)
    await wrapper.setProps({ open: true })
    await flushPromises()

    await wrapper.find('#create-request-location').setValue('Roof')
    await wrapper.find('#create-request-maintenanceType').setValue('Plumbing')
    await wrapper.find('#create-request-createdBy').setValue(9)
    await wrapper.find('#create-request-requestStatus').setValue('InProgress')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(fetchMock).toHaveBeenCalledTimes(2)
    const [url, init] = fetchMock.mock.calls[1]!
    expect(url).toBe('/api/MaintenanceRequest/CreateMaintenanceRequest')
    expect(init?.method).toBe('POST')
    expect(JSON.parse(String(init?.body))).toEqual({
      location: 'Roof',
      maintenanceType: 'Plumbing',
      createdBy: 9,
      requestStatus: 'InProgress',
    })

    expect(wrapper.emitted('created')?.[0]).toEqual([created])
    const openUpdates = wrapper.emitted('update:open')
    expect(openUpdates?.[openUpdates.length - 1]).toEqual([false])

    wrapper.unmount()
  })

  it('as a tenant, POSTs without a createdBy key so the API uses the session', async () => {
    const created = {
      id: 13,
      location: 'Kitchen',
      maintenanceType: 'Plumbing',
      createdAt: '2026-09-13T00:00:00Z',
      createdBy: 1,
      createdByName: 'Terry Tenant',
      requestStatus: 'Open',
    }
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(jsonResponse(created))
    vi.stubGlobal('fetch', fetchMock)

    const wrapper = mountAs(tenant)
    await wrapper.setProps({ open: true })
    await flushPromises()

    await wrapper.find('#create-request-location').setValue('Kitchen')
    await wrapper.find('#create-request-maintenanceType').setValue('Plumbing')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('/api/MaintenanceRequest/CreateMaintenanceRequest')
    const body = JSON.parse(String(init?.body))
    expect(body).not.toHaveProperty('createdBy')
    expect(body).toEqual({
      location: 'Kitchen',
      maintenanceType: 'Plumbing',
      requestStatus: 'Open',
    })

    expect(wrapper.emitted('created')?.[0]).toEqual([created])

    wrapper.unmount()
  })

  it('does not emit created or close when the request fails', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse(usersBody))
      .mockResolvedValueOnce({ ok: false, status: 400 } as Response)
    vi.stubGlobal('fetch', fetchMock)

    const wrapper = mountAs(admin)
    await wrapper.setProps({ open: true })
    await flushPromises()

    await wrapper.find('#create-request-location').setValue('Roof')
    await wrapper.find('#create-request-maintenanceType').setValue('Plumbing')
    await wrapper.find('#create-request-createdBy').setValue(4)
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.emitted('created')).toBeUndefined()
    expect(wrapper.emitted('update:open')).toBeUndefined()

    wrapper.unmount()
  })

  it('clears the form when closed', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(usersBody))
    vi.stubGlobal('fetch', fetchMock)

    const wrapper = mountAs(admin)
    await wrapper.setProps({ open: true })
    await flushPromises()
    await wrapper.find('#create-request-location').setValue('Roof')
    await wrapper.find('#create-request-createdBy').setValue(4)

    await wrapper.setProps({ open: false })
    await flushPromises()
    await wrapper.setProps({ open: true })
    await flushPromises()

    expect((wrapper.find('#create-request-location').element as HTMLInputElement).value).toBe('')
    expect((wrapper.find('#create-request-createdBy').element as HTMLSelectElement).value).toBe('')
    expect((wrapper.find('#create-request-requestStatus').element as HTMLSelectElement).value).toBe(
      'Open',
    )

    wrapper.unmount()
  })
})

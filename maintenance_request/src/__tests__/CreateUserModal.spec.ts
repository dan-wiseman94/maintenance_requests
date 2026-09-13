import { describe, it, expect, vi, afterEach } from 'vitest'

import { mount, flushPromises } from '@vue/test-utils'
import CreateUserModal from '@/components/CreateUserModal.vue'

describe('CreateUserModal', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  const fillForm = async (wrapper: ReturnType<typeof mount>) => {
    await wrapper.find('#create-user-firstName').setValue('Alice')
    await wrapper.find('#create-user-lastName').setValue('Smith')
    await wrapper.find('#create-user-address').setValue('1 Main St')
    await wrapper.find('#create-user-userRole').setValue('Admin')
  }

  it('opens the dialog when open is true', async () => {
    const wrapper = mount(CreateUserModal, { attachTo: document.body, props: { open: false } })
    const dialog = wrapper.find('dialog').element as HTMLDialogElement

    expect(dialog.open).toBe(false)
    await wrapper.setProps({ open: true })
    expect(dialog.open).toBe(true)

    wrapper.unmount()
  })

  it('POSTs the enum name for userRole and emits created on success', async () => {
    const created = {
      id: 7,
      firstName: 'Alice',
      lastName: 'Smith',
      address: '1 Main St',
      userRole: 'Admin',
    }
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      json: vi.fn<() => Promise<unknown>>().mockResolvedValue(created),
    } as unknown as Response)
    vi.stubGlobal('fetch', fetchMock)

    const wrapper = mount(CreateUserModal, { attachTo: document.body, props: { open: true } })
    await fillForm(wrapper)
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('/api/User')
    expect(init?.method).toBe('POST')
    expect(JSON.parse(String(init?.body))).toEqual({
      firstName: 'Alice',
      lastName: 'Smith',
      address: '1 Main St',
      userRole: 'Admin',
    })

    expect(wrapper.emitted('created')?.[0]).toEqual([created])
    expect(wrapper.emitted('update:open')?.at(-1)).toEqual([false])

    wrapper.unmount()
  })

  it('does not emit created or close when the request fails', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue({ ok: false, status: 400 } as Response)
    vi.stubGlobal('fetch', fetchMock)

    const wrapper = mount(CreateUserModal, { attachTo: document.body, props: { open: true } })
    await fillForm(wrapper)
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.emitted('created')).toBeUndefined()
    expect(wrapper.emitted('update:open')).toBeUndefined()

    wrapper.unmount()
  })

  it('clears the form when closed', async () => {
    const wrapper = mount(CreateUserModal, { attachTo: document.body, props: { open: true } })
    await fillForm(wrapper)

    await wrapper.setProps({ open: false })
    await wrapper.setProps({ open: true })

    expect((wrapper.find('#create-user-firstName').element as HTMLInputElement).value).toBe('')
    expect((wrapper.find('#create-user-userRole').element as HTMLSelectElement).value).toBe(
      'Tenant',
    )

    wrapper.unmount()
  })
})

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { flushPromises, mount } from '@vue/test-utils'
import { RouterLink } from 'vue-router'
import App from '../App.vue'
import router from '@/router'
import UsersView from '@/views/UsersView.vue'
import RequestsView from '@/views/RequestsView.vue'

describe('App', () => {
  beforeEach(async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ items: [], page: 1, pageSize: 20, totalCount: 0 }),
      }),
    )
    await router.push('/')
    await router.isReady()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('mounts renders properly', async () => {
    const wrapper = mount(App, {
      global: {
        stubs: { RouterLink: true, RouterView: true },
      },
    })
    expect(wrapper.text()).toContain('Residential Maintenance Requests')
  })

  it('renders the three nav links with the right to values', () => {
    const wrapper = mount(App, {
      global: { plugins: [router] },
    })

    const links = wrapper.findAllComponents(RouterLink)
    expect(links.map((link) => link.props('to'))).toEqual(['/', '/users', '/requests'])
    expect(links.map((link) => link.text())).toEqual(['Default', 'View Users', 'View Requests'])
  })

  it('navigating to /users renders UsersView, and /requests renders RequestsView', async () => {
    const wrapper = mount(App, {
      global: { plugins: [router] },
    })

    await router.push('/users')
    await router.isReady()
    await flushPromises()

    expect(wrapper.findComponent(UsersView).exists()).toBe(true)
    expect(wrapper.findComponent(RequestsView).exists()).toBe(false)

    await router.push('/requests')
    await router.isReady()
    await flushPromises()

    expect(wrapper.findComponent(RequestsView).exists()).toBe(true)
    expect(wrapper.findComponent(UsersView).exists()).toBe(false)
  })
})

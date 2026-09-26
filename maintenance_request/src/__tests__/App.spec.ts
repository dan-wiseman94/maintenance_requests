import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createMemoryHistory, RouterLink, type Router } from 'vue-router'
import App from '../App.vue'
import { createAppRouter } from '@/router'
import UsersView from '@/views/UsersView.vue'
import RequestsView from '@/views/RequestsView.vue'
import { admin, tenant, stubFetch, emptyPage } from './fixtures/auth.ts'

// The views fetch a page of rows as soon as they render; give them an empty one.
const data = [
  { url: '/api/User', body: emptyPage },
  { url: '/api/MaintenanceRequest', body: emptyPage },
]

describe('App', () => {
  // A fresh router per test, for the same reason as router.spec.ts: a push to the location
  // the router is already on is a duplicated navigation and never runs the guard.
  let router: Router
  beforeEach(() => {
    router = createAppRouter(createMemoryHistory())
  })
  afterEach(() => vi.unstubAllGlobals())

  // Installing the router kicks off its first navigation, and the guard asks the auth store
  // for /me, so every mount needs a Pinia and every test stubs /me before mounting.

  it('mounts renders properly', async () => {
    stubFetch([{ url: '/api/Auth/me', status: 401 }])
    const wrapper = mount(App, { global: { plugins: [createPinia(), router] } })
    await flushPromises()
    expect(wrapper.text()).toContain('Residential Maintenance Requests')
  })

  it('hides the nav while signed out', async () => {
    stubFetch([{ url: '/api/Auth/me', status: 401 }])
    const wrapper = mount(App, { global: { plugins: [createPinia(), router] } })
    await router.push('/requests')
    await flushPromises()
    expect(wrapper.find('nav').exists()).toBe(false)
    expect(router.currentRoute.value.name).toBe('login')
  })

  it('shows Requests and Users to an admin, with a sign-out control', async () => {
    stubFetch([{ url: '/api/Auth/me', body: admin }, ...data])
    const wrapper = mount(App, { global: { plugins: [createPinia(), router] } })
    await router.push('/requests')
    await flushPromises()
    const links = wrapper.findAllComponents(RouterLink)
    expect(links.map((l) => l.text())).toEqual(['View Requests', 'View Users'])
    expect(wrapper.text()).toContain('Ada · Admin')
    expect(wrapper.find('button.sign-out').exists()).toBe(true)
  })

  it('hides Users from a tenant', async () => {
    stubFetch([{ url: '/api/Auth/me', body: tenant }, ...data])
    const wrapper = mount(App, { global: { plugins: [createPinia(), router] } })
    await router.push('/requests')
    await flushPromises()
    expect(wrapper.findAllComponents(RouterLink).map((l) => l.text())).toEqual(['View Requests'])
  })

  it('navigating to /users renders UsersView, and /requests renders RequestsView', async () => {
    // /users is admin-only now, so this walk-through needs a signed-in admin.
    stubFetch([{ url: '/api/Auth/me', body: admin }, ...data])
    const wrapper = mount(App, { global: { plugins: [createPinia(), router] } })

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

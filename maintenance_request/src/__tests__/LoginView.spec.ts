import { describe, it, expect, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import LoginView from '@/views/LoginView.vue'
import { admin, stubFetch } from './fixtures/auth.ts'

const Stub = { template: '<div/>' }

const mountLogin = async (initial = '/login') => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/login', component: LoginView },
      { path: '/', component: Stub },
      { path: '/users', component: Stub },
    ],
  })

  await router.push(initial)
  await router.isReady()
  const wrapper = mount(LoginView, { global: { plugins: [createPinia(), router] } })
  return { wrapper, router }
}

const fill = async (wrapper: Awaited<ReturnType<typeof mountLogin>>['wrapper']) => {
  await wrapper.find('#login-email').setValue('admin@test.local')
  await wrapper.find('#login-password').setValue('pw')
  await wrapper.find('form').trigger('submit')
  await flushPromises()
}

describe('LoginView', () => {
  afterEach(() => vi.unstubAllGlobals)

  it('signs in and follows a local redirect', async () => {
    stubFetch([{ url: '/api/Auth/login', body: admin }])
    const { wrapper, router } = await mountLogin('/login?redirect=%2Fusers')
    await fill(wrapper)
    expect(router.currentRoute.value.path).toBe('/users')
  })

  it('refuses an off-site redirect and goes home instead', async () => {
    stubFetch([{ url: '/api/Auth/login', body: admin }])
    const { wrapper, router } = await mountLogin('/login?redirect=//evil.example')
    await fill(wrapper)
    expect(router.currentRoute.value.path).toBe('/')
  })

  it('shows the error and clears the password on 401', async () => {
    stubFetch([{ url: '/api/Auth/login', status: 401 }])
    const { wrapper, router } = await mountLogin()
    await fill(wrapper)
    expect(wrapper.find('[role="alert"]').text()).toBe('Email or password is incorrect.')
    expect((wrapper.find('#login-password').element as HTMLInputElement).value).toBe('')
    expect(router.currentRoute.value.path).toBe('/login')
  })
})

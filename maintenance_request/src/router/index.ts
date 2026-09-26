import { createRouter, createWebHistory, type RouterHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import type { UserRole } from '@/types'
import LoginView from '@/views/LoginView.vue'
import UsersView from '@/views/UsersView.vue'
import RequestsView from '@/views/RequestsView.vue'

declare module 'vue-router' {
  interface RouteMeta {
    /** Reachable without a session. Everything else needs one. */
    public?: boolean
    /** If set, the signed-in user's role must be one of these. */
    roles?: UserRole[]
  }
}

/**
 * Builds the app router. `main.ts` uses the default export below; tests pass a
 * `createMemoryHistory()` so each test owns a router that starts from scratch
 * instead of inheriting the position the previous test left behind.
 */
export function createAppRouter(
  history: RouterHistory = createWebHistory(import.meta.env.BASE_URL),
) {
  const router = createRouter({
    history,
    routes: [
      { path: '/login', name: 'login', component: LoginView, meta: { public: true } },
      { path: '/', redirect: { name: 'requests' } },
      { path: '/requests', name: 'requests', component: RequestsView },
      { path: '/users', name: 'users', component: UsersView, meta: { roles: ['Admin'] } },
    ],
  })

  router.beforeEach(async (to) => {
    // Resolved inside the guard: Pinia is installed by the time navigation starts,
    // but not necessarily when this module is first imported.
    const auth = useAuthStore()
    if (!auth.ready) await auth.fetchMe()

    if (to.meta.public) {
      // A signed-in user has no business on the login page.
      return auth.isAuthenticated ? { name: 'requests' } : true
    }
    if (!auth.isAuthenticated) {
      return { name: 'login', query: { redirect: to.fullPath } }
    }
    if (to.meta.roles && (!auth.role || !to.meta.roles.includes(auth.role))) {
      return { name: 'requests' }
    }
    return true
  })

  return router
}

export default createAppRouter()

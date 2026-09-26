import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { User, UserRole } from '@/types.ts'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const ready = ref(false)

  const isAuthenticated = computed(() => user.value !== null)
  const role = computed<UserRole | null>(() => user.value?.userRole ?? null)
  const isAdmin = computed(() => role.value === 'Admin')
  const canManageRequests = computed(() => role.value === 'Admin' || role.value === 'Maintenance')

  async function fetchMe(): Promise<void> {
    try {
      const response = await fetch('/api/Auth/me')
      user.value = response.ok ? await response.json() : null
    } catch {
      user.value = null
    } finally {
      ready.value = true
    }
  }

  async function login(email: string, password: string): Promise<void> {
    const response = await fetch('/api/Auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    if (!response.ok) {
      throw new Error(
        response.status === 401
          ? 'Email or password is incorrect.'
          : `Sign-in failed (${response.status})`,
      )
    }
    user.value = await response.json()
    ready.value = true
  }

  async function logout(): Promise<void> {
    try {
      await fetch('/api/Auth/logout', { method: 'POST' })
    } finally {
      user.value = null
    }
  }

  function clear(): void {
    user.value = null
  }

  return {
    user,
    ready,
    isAuthenticated,
    role,
    isAdmin,
    canManageRequests,
    fetchMe,
    login,
    logout,
    clear,
  }
})

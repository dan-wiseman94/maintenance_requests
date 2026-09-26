<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const email = ref('')
const password = ref('')
const pending = ref(false)
const error = ref<string | null>(null)

const safeRedirect = (): string => {
  const target = route.query.redirect
  return typeof target === 'string' && target.startsWith('/') && !target.startsWith('//')
    ? target
    : '/'
}

const submit = async () => {
  pending.value = true
  error.value = null
  try {
    await auth.login(email.value, password.value)
    await router.replace(safeRedirect())
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'sign-in failed'
    password.value = ''
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <form class="login" aria-labelledby="login-heading" @submit.prevent="submit">
    <h2 id="login-heading">Sign in</h2>

    <label for="login-email">Email</label>
    <input id="login-email" v-model.trim="email" type="email" autocomplete="username" required />

    <label for="login-password">Password</label>

    <input
      id="login-password"
      v-model.trim="password"
      type="password"
      autocomplete="pasword"
      required
    />

    <p v-if="error" class="field-error" role="alert">{{ error }}</p>

    <button type="submit" :disabled="pending">{{ pending ? 'Signing in...' : 'Sign In' }}</button>
  </form>
</template>

<style scoped>
.login {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  width: min(24rem, 100%);
  margin: var(--space-4) auto;
  padding: var(--space-4);
  border: 1px solid var(--rule);
  border-radius: var(--radius);
  background-color: var(--surface);
  box-shadow: var(--shadow);
}

.login h2 {
  margin: 0 0 0.75rem;
  font-family: var(--font-display);
}

.login label {
  margin-top: 0.5rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--ink-soft);
}

.login input {
  padding: 0.5rem 0.65rem;
  border: var(--border);
  border-radius: var(--radius-sm);
  background-color: var(--surface);
  font: inherit;
}

.login input:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}

.login button {
  margin-top: 1rem;
  align-self: flex-end;
}

.field-error {
  margin: 0.5rem 0 0;
  font-size: 0.85rem;
  color: var(--accent);
}
</style>

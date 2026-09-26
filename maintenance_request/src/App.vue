<script setup lang="ts">
import 'vue-sonner/style.css'
import { Toaster } from 'vue-sonner'
import { useRouter } from 'vue-router'
import { useAuthStore } from './stores/auth'

const auth = useAuthStore()
const router = useRouter()

const signOut = async () => {
  await auth.logout()
  router.push({ name: 'login' })
}
</script>

<template>
  <main>
    <div class="center">
      <h1>Residential Maintenance Requests</h1>
      <nav v-if="auth.user" class="link-bar" aria-label="Primary">
        <RouterLink :to="{ name: 'requests' }">View Requests</RouterLink>
        <RouterLink v-if="auth.isAdmin" :to="{ name: 'users' }">View Users</RouterLink>
        <span class="who">{{ auth.user.firstName }} · {{ auth.user.userRole }}</span>
        <button type="button" class="sign-out" @click="signOut">Sign Out</button>
      </nav>
      <RouterView />
    </div>
    <Toaster />
  </main>
</template>

<style scoped>
main {
  display: flex;
  flex-direction: column;
  align-items: center;
}

h1 {
  margin: 0 0 var(--space-4);
  font-family: var(--font-display);
  font-size: clamp(1.55rem, 1rem + 2.2vw, 2.35rem);
  font-weight: 700;
  line-height: 1.15;
  letter-spacing: 0.01em;
  text-align: center;
  text-wrap: balance;
}

/* short accent rule under the title */
h1::after {
  content: '';
  display: block;
  width: 4rem;
  height: 3px;
  margin: var(--space-3) auto 0;
  border-radius: 2px;
  background-color: var(--accent);
}

.who {
  color: var(--ink-faint);
  margin-left: auto;
}

.sign-out {
  all: unset;
  cursor: pointer;
  color: var(--accent);
}
</style>

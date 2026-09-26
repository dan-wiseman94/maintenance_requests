import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { onUnauthorized } from '@/lib/api.ts'
import { useAuthStore } from './stores/auth.ts'

import App from './App.vue'
import router from './router'
import './assets/main.css'
const app = createApp(App)

app.use(createPinia())
app.use(router)

onUnauthorized(() => {
  useAuthStore().clear()
  router.push({ name: 'login', query: { redirect: router.currentRoute.value.fullPath } })
})

app.mount('#app')

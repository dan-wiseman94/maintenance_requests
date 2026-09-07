import { createRouter, createWebHistory } from 'vue-router'

import UsersView from '@/views/UsersView.vue';
import RequestsView from '@/views/RequestsView.vue';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', component: RequestsView}, // TODO: PLACEHOLDER (maybe)
    { path: '/users', component: UsersView},
    {path: '/requests', component: RequestsView}
  ],
})

export default router

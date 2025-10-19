import { useRouteGuards } from '@/hooks/useRouteGuards'
import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('../components/views/HomeView.vue'),
    },
    {
      path: '/schedule',
      name: 'schedule',
      component: () => import('../components/views/CalendarView.vue'),
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('../components/views/authenticated/DashboardView.vue'),
      beforeEnter: async (to, from, next) => useRouteGuards().authGuard({ next }),
    },
    {
      path: '/404',
      name: '404',
      component: () => import('../components/views/UnauthorizedView.vue'),
    },
    {
      path: '/profile',
      name: 'profile',
      component: () => import('../components/views/authenticated/ProfileView.vue'),
      beforeEnter: async (to, from, next) => useRouteGuards().authGuard({ next }),
    },
  ],
})

export default router

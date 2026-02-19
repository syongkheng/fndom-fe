import { useRouteGuards } from '@/hooks/useRouteGuards'
import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('../components/views/kingshot/HomeView.vue'),
    },
    {
      path: '/ks/kop',
      name: 'kop-form',
      component: () => import('../components/views/kingshot/KopFormView.vue'),
    },
    {
      path: '/ks/kop/res',
      name: 'kop-form-res',
      component: () => import('../components/views/kingshot/AppointmentView.vue'),
    },
    // {
    //   path: '/schedule',
    //   name: 'schedule',
    //   component: () => import('../components/views/CalendarView.vue'),
    // },
    // {
    //   path: '/dashboard',
    //   name: 'dashboard',
    //   component: () => import('../components/views/authenticated/DashboardView.vue'),
    //   beforeEnter: async (to, from, next) => useRouteGuards().authGuard({ next }),
    // },
    // {
    //   path: '/404',
    //   name: '404',
    //   component: () => import('../components/views/UnauthorizedView.vue'),
    // },
    // {
    //   path: '/profile',
    //   name: 'profile',
    //   component: () => import('../components/views/authenticated/ProfileView.vue'),
    //   beforeEnter: async (to, from, next) => useRouteGuards().authGuard({ next }),
    // },
    // {
    //   path: '/pphs',
    //   name: 'pphs',
    //   component: () => import('../components/views/hdb/HomeView.vue'),
    //   // beforeEnter: async (to, from, next) => useRouteGuards().authGuard({ next }),
    // },
    // {
    //   path: '/travel',
    //   name: 'travel',
    //   component: () => import('../components/views/travel/TravelHomeView.vue'),
    // },
    // {
    //   path: '/schedule',
    //   name: 'schedule',
    //   component: () => import('../components/views/schedule/ScheduleHomeView.vue'),
    // },
    // {
    //   path: '/habit',
    //   name: 'habit',
    //   component: () => import('../components/views/habit/HabitHomeView.vue'),
    // },
    // {
    //   path: '/debug/pphs',
    //   name: 'debug-pphs',
    //   component: () => import('../components/views/hdb/DebugView.vue'),
    // },
  ],
})

export default router

import { useRouteGuards } from '@/hooks/useRouteGuards'
import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('../components/views/WorkbenchView.vue'),
    },
    {
      path: '/ks',
      name: 'kingshot',
      component: () => import('../components/views/kingshot/HomeView.vue'),
    },
    {
      path: '/ks/agreement',
      name: 'ks-agreement',
      component: () => import('../components/views/kingshot/AgreementView.vue'),
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
    //   component: () => import('../components/views/schedule/ScheduleHomeView.vue'),
    // },
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
    {
      path: '/pphs',
      name: 'pphs',
      component: () => import('../components/views/hdb/HomeView.vue'),
    },
    {
      path: '/travel',
      name: 'travel',
      component: () => import('../components/views/travel/TravelListView.vue'),
      beforeEnter: async (to, from, next) => useRouteGuards().authGuard({ next }),
    },
    {
      path: '/travel/v/:shortCode',
      name: 'travel-viewer',
      component: () => import('../components/views/travel/TravelViewerView.vue'),
    },
    {
      path: '/travel/:sessionId',
      name: 'travel-planner',
      component: () => import('../components/views/travel/TravelPlannerView.vue'),
      beforeEnter: async (to, from, next) => useRouteGuards().authGuard({ next }),
    },
    {
      path: '/admin/users',
      name: 'admin-users',
      component: () => import('../components/views/admin/UserManagementView.vue'),
      beforeEnter: async (to, from, next) => useRouteGuards().systemR5Guard({ next }),
    },
    // {
    //   path: '/habit',
    //   name: 'habit',
    //   component: () => import('../components/views/habit/HabitHomeView.vue'),
    // },
  ],
})

export default router

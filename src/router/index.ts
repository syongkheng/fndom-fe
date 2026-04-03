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
      beforeEnter: async (to, from, next) => useRouteGuards().featureGuard({ next, featureKey: 'kingshot' }),
    },
    {
      path: '/ks/agreement',
      name: 'ks-agreement',
      component: () => import('../components/views/kingshot/AgreementView.vue'),
      beforeEnter: async (to, from, next) => useRouteGuards().featureGuard({ next, featureKey: 'kingshot' }),
    },
    {
      path: '/ks/kop',
      name: 'kop-form',
      component: () => import('../components/views/kingshot/KopFormView.vue'),
      beforeEnter: async (to, from, next) => useRouteGuards().featureGuard({ next, featureKey: 'kop-registration' }),
    },
    {
      path: '/ks/kop/res',
      name: 'kop-form-res',
      component: () => import('../components/views/kingshot/AppointmentView.vue'),
      beforeEnter: async (to, from, next) => useRouteGuards().featureGuard({ next, featureKey: 'kop-registration' }),
    },
    // {
    //   path: '/schedule',
    //   name: 'schedule',
    //   component: () => import('../components/views/schedule/ScheduleHomeView.vue'),
    // },
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
      beforeEnter: async (to, from, next) => useRouteGuards().featureGuard({ next, featureKey: 'pphs' }),
    },
    {
      path: '/flat',
      name: 'flat',
      component: () => import('../components/views/flat/HomeView.vue'),
      beforeEnter: async (to, from, next) => useRouteGuards().featureGuard({ next, featureKey: 'flat-analysis' }),
    },
    {
      path: '/travel',
      name: 'travel',
      component: () => import('../components/views/travel/TravelListView.vue'),
      beforeEnter: async (to, from, next) => useRouteGuards().authAndFeatureGuard({ next, featureKey: 'travel' }),
    },
    {
      path: '/travel/v/:shortCode',
      name: 'travel-viewer',
      component: () => import('../components/views/travel/TravelViewerView.vue'),
      beforeEnter: async (to, from, next) => useRouteGuards().featureGuard({ next, featureKey: 'travel' }),
    },
    {
      path: '/travel/:sessionId',
      name: 'travel-planner',
      component: () => import('../components/views/travel/TravelPlannerView.vue'),
      beforeEnter: async (to, from, next) => useRouteGuards().authAndFeatureGuard({ next, featureKey: 'travel' }),
    },
    {
      path: '/douyin',
      name: 'douyin',
      component: () => import('../components/views/douyin/HomeView.vue'),
      beforeEnter: async (to, from, next) => useRouteGuards().authAndFeatureGuard({ next, featureKey: 'douyin' }),
    },
    {
      path: '/meal',
      name: 'meal',
      component: () => import('../components/views/meal/HomeView.vue'),
      beforeEnter: async (to, from, next) => useRouteGuards().authAndFeatureGuard({ next, featureKey: 'meal' }),
    },
    {
      path: '/sleep',
      name: 'sleep',
      component: () => import('../components/views/sleep/HomeView.vue'),
      beforeEnter: async (to, from, next) => useRouteGuards().authAndFeatureGuard({ next, featureKey: 'sleep' }),
    },
    {
      path: '/wedding',
      name: 'wedding',
      component: () => import('../components/views/wedding/HomeView.vue'),
      beforeEnter: async (to, from, next) => useRouteGuards().authAndFeatureGuard({ next, featureKey: 'wedding' }),
    },
    {
      path: '/wedding/dates/v/:shortCode',
      name: 'wedding-dates-viewer',
      component: () => import('../components/views/wedding/WeddingDatesViewerView.vue'),
      beforeEnter: async (to, from, next) => useRouteGuards().featureGuard({ next, featureKey: 'wedding' }),
    },
    {
      path: '/expense',
      name: 'expense',
      component: () => import('../components/views/expense/HomeView.vue'),
      beforeEnter: async (to, from, next) => useRouteGuards().authAndFeatureGuard({ next, featureKey: 'expense' }),
    },
    {
      path: '/telegram',
      name: 'telegram',
      component: () => import('../components/views/telegram/HomeView.vue'),
      beforeEnter: async (to, from, next) => useRouteGuards().authAndFeatureGuard({ next, featureKey: 'telegram' }),
    },
    {
      path: '/admin',
      name: 'admin',
      component: () => import('../components/views/admin/AdminView.vue'),
      beforeEnter: async (to, from, next) => useRouteGuards().systemR5Guard({ next }),
    },
    {
      path: '/admin/users',
      name: 'admin-users',
      component: () => import('../components/views/admin/UserManagementView.vue'),
      beforeEnter: async (to, from, next) => useRouteGuards().systemR5Guard({ next }),
    },
    {
      path: '/admin/features',
      name: 'admin-features',
      component: () => import('../components/views/admin/FeatureFlagView.vue'),
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

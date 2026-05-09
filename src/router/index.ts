import { useRouteGuards } from '@/hooks/useRouteGuards'
import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('../components/views/LandingView.vue'),
    },
    {
      path: '/workbench',
      name: 'workbench',
      component: () => import('../components/views/WorkbenchView.vue'),
      beforeEnter: async (to, from, next) => useRouteGuards().systemR5Guard({ next }),
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
      beforeEnter: [
        async (to, from, next) => useRouteGuards().systemR5Guard({ next }),
        async (to, from, next) => useRouteGuards().featureGuard({ next, featureKey: 'pphs' }),
      ],
    },
    {
      path: '/scenic',
      name: 'scenic',
      component: () => import('../components/views/scenic/HomeView.vue'),
      beforeEnter: [
        async (to, from, next) => useRouteGuards().systemR5Guard({ next }),
        async (to, from, next) =>
          useRouteGuards().featureGuard({ next, featureKey: 'china-scenic' }),
      ],
    },
    {
      path: '/flat',
      name: 'flat',
      component: () => import('../components/views/flat/HomeView.vue'),
      beforeEnter: [
        async (to, from, next) => useRouteGuards().systemR5Guard({ next }),
        async (to, from, next) =>
          useRouteGuards().featureGuard({ next, featureKey: 'flat-analysis' }),
      ],
    },
    {
      path: '/travel',
      name: 'travel',
      component: () => import('../components/views/travel/TravelListView.vue'),
      beforeEnter: [
        async (to, from, next) => useRouteGuards().authGuard({ next }),
        async (to, from, next) => useRouteGuards().featureGuard({ next, featureKey: 'travel' }),
      ],
    },
    {
      path: '/travel/v/:shortCode',
      name: 'travel-viewer',
      component: () => import('../components/views/travel/TravelViewerView.vue'),
      beforeEnter: async (to, from, next) =>
        useRouteGuards().featureGuard({ next, featureKey: 'travel' }),
    },
    {
      path: '/travel/draft',
      name: 'travel-draft',
      component: () => import('../components/views/travel/TravelPlannerView.vue'),
      beforeEnter: async (to, from, next) =>
        useRouteGuards().featureGuard({ next, featureKey: 'travel' }),
    },
    {
      path: '/travel/:sessionId',
      name: 'travel-planner',
      component: () => import('../components/views/travel/TravelPlannerView.vue'),
      beforeEnter: async (to, from, next) =>
        useRouteGuards().featureGuard({ next, featureKey: 'travel' }),
    },
    {
      path: '/douyin',
      name: 'douyin',
      component: () => import('../components/views/douyin/HomeView.vue'),
      beforeEnter: [
        async (to, from, next) => useRouteGuards().systemR5Guard({ next }),
        async (to, from, next) => useRouteGuards().featureGuard({ next, featureKey: 'douyin' }),
      ],
    },
    {
      path: '/sleep',
      name: 'sleep',
      component: () => import('../components/views/sleep/HomeView.vue'),
      beforeEnter: [
        async (to, from, next) => useRouteGuards().systemR5Guard({ next }),
        async (to, from, next) => useRouteGuards().featureGuard({ next, featureKey: 'sleep' }),
      ],
    },
    {
      path: '/telegram',
      name: 'telegram',
      component: () => import('../components/views/telegram/HomeView.vue'),
      beforeEnter: [
        async (to, from, next) => useRouteGuards().systemR5Guard({ next }),
        async (to, from, next) => useRouteGuards().featureGuard({ next, featureKey: 'telegram' }),
      ],
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
    {
      path: '/admin/tg-image',
      name: 'admin-tg-image',
      component: () => import('../components/views/admin/TgImageAdminView.vue'),
      beforeEnter: async (to, from, next) => useRouteGuards().systemR5Guard({ next }),
    },
    {
      path: '/404',
      name: '404',
      component: () => import('../components/views/UnauthorizedView.vue'),
    },
  ],
})

export default router

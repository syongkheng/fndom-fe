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
      beforeEnter: async (to, from, next) => useRouteGuards().systemR5Guard({ next }),
    },
    {
      path: '/scenic',
      name: 'scenic',
      component: () => import('../components/views/scenic/HomeView.vue'),
      beforeEnter: async (to, from, next) => useRouteGuards().systemR5Guard({ next }),
    },
    {
      path: '/flat',
      name: 'flat',
      component: () => import('../components/views/flat/HomeView.vue'),
      beforeEnter: async (to, from, next) => useRouteGuards().systemR5Guard({ next }),
    },
    {
      path: '/travel',
      name: 'travel',
      component: () => import('../components/views/travel/TravelLandingView.vue'),
    },
    {
      path: '/travel/trips',
      name: 'travel-trips',
      component: () => import('../components/views/travel/TravelListView.vue'),
      beforeEnter: async (to, from, next) => useRouteGuards().authGuard({ next }),
    },
    {
      path: '/travel/v/:shortCode',
      name: 'travel-viewer',
      component: () => import('../components/views/travel/TravelViewerView.vue'),
    },
    {
      path: '/travel/draft',
      name: 'travel-draft',
      component: () => import('../components/views/travel/TravelPlannerView.vue'),
    },
    {
      path: '/travel/:sessionId',
      name: 'travel-planner',
      component: () => import('../components/views/travel/TravelPlannerView.vue'),
    },
    {
      path: '/baby',
      name: 'baby-tracker',
      component: () => import('../components/views/baby/BabyTrackerView.vue'),
      beforeEnter: async (to, from, next) => useRouteGuards().authGuard({ next }),
    },
    {
      path: '/iot-key',
      name: 'iot-key',
      component: () => import('../components/views/iot/IotDeviceKeyView.vue'),
      beforeEnter: async (to, from, next) => useRouteGuards().authGuard({ next }),
    },
    {
      path: '/douyin',
      name: 'douyin',
      component: () => import('../components/views/douyin/HomeView.vue'),
      beforeEnter: async (to, from, next) => useRouteGuards().systemR5Guard({ next }),
    },
    {
      path: '/telegram',
      name: 'telegram',
      component: () => import('../components/views/telegram/HomeView.vue'),
      beforeEnter: async (to, from, next) => useRouteGuards().systemR5Guard({ next }),
    },
    {
      path: '/ippt',
      name: 'ippt',
      component: () => import('../components/views/ippt/HomeView.vue'),
      beforeEnter: async (to, from, next) => useRouteGuards().systemR5Guard({ next }),
    },
    {
      path: '/llm',
      name: 'llm',
      component: () => import('../components/views/marketplace/MarketplaceView.vue'),
    },
    {
      path: '/llm/chat',
      name: 'llm-chat',
      component: () => import('../components/views/marketplace/ChatView.vue'),
      beforeEnter: async (to, from, next) => useRouteGuards().authGuard({ next }),
    },
    {
      path: '/llm/wallet',
      name: 'llm-wallet',
      component: () => import('../components/views/marketplace/WalletView.vue'),
      beforeEnter: async (to, from, next) => useRouteGuards().authGuard({ next }),
    },
    {
      path: '/llm/api-key',
      name: 'llm-api-key',
      component: () => import('../components/views/marketplace/ApiKeyView.vue'),
      beforeEnter: async (to, from, next) => useRouteGuards().authGuard({ next }),
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
      path: '/admin/tg-image',
      name: 'admin-tg-image',
      component: () => import('../components/views/admin/TgImageAdminView.vue'),
      beforeEnter: async (to, from, next) => useRouteGuards().systemR5Guard({ next }),
    },
    {
      path: '/admin/llm-pricing',
      name: 'admin-llm-pricing',
      component: () => import('../components/views/admin/MarketplacePricingView.vue'),
      beforeEnter: async (to, from, next) => useRouteGuards().systemR5Guard({ next }),
    },
    {
      path: '/imghost',
      name: 'imghost',
      component: () => import('../components/views/imghost/HomeView.vue'),
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

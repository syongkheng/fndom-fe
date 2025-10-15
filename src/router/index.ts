import { createRouter, createWebHistory } from 'vue-router'
import UnauthorizedView from '@/views/UnauthorizedView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('../views/HomeView.vue'),
    },

    {
      path: '/404',
      name: '404',
      component: UnauthorizedView,
    },
    // {
    //   path: '/profile',
    //   name: 'profile',
    //   component: ProfileView,
    //   beforeEnter: async (to, from, next) => useRouteGuards().authGuard({ next }),
    // },
  ],
})

export default router

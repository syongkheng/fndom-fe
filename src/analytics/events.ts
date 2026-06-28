import { track } from './index'

export const Analytics = {
  pageView(path: string, routeName: string) {
    track('page_view', { path, route: routeName })
  },

  authLogin() {
    track('auth_login')
  },

  authRegister() {
    track('auth_register')
  },

  authVerified() {
    track('auth_email_verified')
  },

  authLogout() {
    track('auth_logout')
  },

  featureAccess(feature: string) {
    track('feature_access', { feature })
  },

  buttonClick(label: string, properties: Record<string, unknown> = {}) {
    track('button_click', { label, ...properties })
  },
}

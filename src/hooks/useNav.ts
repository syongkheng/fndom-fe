import { useRouter } from 'vue-router'
import type { RouteLocationRaw } from 'vue-router'

export function useNav() {
  const router = useRouter()

  const redirectTo = (
    route: RouteLocationRaw | URL | string,
    options: {
      replace?: boolean
      newTab?: boolean
      query?: Record<string, string>
      hash?: string
    } = {},
  ) => {
    const { replace = false, newTab = false, query, hash } = options

    let queryString = ''
    if (query) {
      const params = new URLSearchParams(query)
      queryString = `?${params.toString()}`
    }

    if (hash) {
      queryString += (queryString ? '&' : '?') + `#${hash}`
    }

    // Handle external URLs
    if (typeof route === 'string' && (route.startsWith('http') || route.startsWith('//'))) {
      return handleExternalUrl(route, newTab)
    }

    // Handle internal URLs in new tab
    if (newTab) {
      const resolved = router.resolve(route)
      const fullPath = resolved.href + queryString // Append query string
      return window.open(fullPath, '_blank')
    }

    // Handle internal URLs without opening in a new tab
    let finalRoute = ''
    if (typeof route === 'string') {
      finalRoute = route
    } else if ('path' in route) {
      finalRoute = route.path ?? ''
    }

    const routeWithQuery = finalRoute + queryString

    const navigate = replace ? router.replace : router.push
    return navigate(routeWithQuery)
  }

  const handleExternalUrl = (url: string, newTab: boolean) => {
    if (newTab) {
      window.open(url, '_blank')
    } else {
      window.location.href = url
    }
  }

  const redirectToRegister = (options = {}) => redirectTo('/register', options)

  const redirectToLogin = () => redirectTo('/login')

  const refreshPage = () => {
    window.location.reload()
  }

  const redirectToLanding = () => {
    redirectTo('/')
  }

  const redirectToDashboard = () => {
    redirectTo('/dashboard')
  }

  const redirectToSchedule = () => {
    redirectTo('/schedule')
  }

  const redirectToUnauthorized = () => {
    redirectTo('/404')
  }

  return {
    refreshPage,
    redirectTo,
    redirectToRegister,
    redirectToLogin,
    redirectToLanding,
    redirectToDashboard,
    redirectToSchedule,
    redirectToUnauthorized,
  }
}

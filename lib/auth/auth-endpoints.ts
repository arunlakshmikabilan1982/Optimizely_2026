export const AUTH_ENDPOINTS = {
  proxy: '/api/auth',
  profileProxy: '/api/auth/profile',
  backend: {
    login: '/api/auth/login',
    register: '/api/auth/register',
    profile: '/api/auth/me',
  },
} as const

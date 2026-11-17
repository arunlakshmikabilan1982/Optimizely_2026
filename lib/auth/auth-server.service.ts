import { AUTH_API_BASE_URL } from '@/lib/api/api-base'
import { apiManager } from '@/lib/api/api-manager'
import { AUTH_ENDPOINTS } from '@/lib/auth/auth-endpoints'
import type { LoginPayload, RegisterPayload } from '@/lib/auth/auth-payloads'

export function authServerService(
  action: 'login' | 'register',
  payload: LoginPayload | RegisterPayload
): ReturnType<typeof apiManager> {
  return apiManager(
    action === 'login'
      ? AUTH_ENDPOINTS.backend.login
      : AUTH_ENDPOINTS.backend.register,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    AUTH_API_BASE_URL
  )
}

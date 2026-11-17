import { apiManager, ApiRequestError } from '@/lib/api/api-manager'
import { AUTH_ENDPOINTS } from '@/lib/auth/auth-endpoints'
import type {
  LoginPayload,
  LoginResponse,
  RegisterPayload,
  SessionResponse,
} from '@/lib/auth/auth-payloads'

async function postAuthAction(
  action: 'login' | 'register' | 'logout',
  payload?: LoginPayload | RegisterPayload
): Promise<unknown> {
  const result = await apiManager(AUTH_ENDPOINTS.proxy, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...payload }),
  })

  if (!result.ok) {
    throw new ApiRequestError(
      `Authentication request failed (${result.status}).`,
      result.status,
      result.data
    )
  }
  return result.data
}

export const authService = {
  async login(payload: LoginPayload): Promise<LoginResponse> {
    const data = await postAuthAction('login', payload)
    if (
      typeof data !== 'object' ||
      data === null ||
      !('user' in data) ||
      typeof data.user !== 'object' ||
      data.user === null
    ) {
      throw new Error('The authentication endpoint returned an invalid user.')
    }
    return data as LoginResponse
  },

  register(payload: RegisterPayload) {
    return postAuthAction('register', payload)
  },

  async getSession() {
    const result = await apiManager(AUTH_ENDPOINTS.proxy)
    if (!result.ok) {
      throw new Error(`Session request failed (${result.status}).`)
    }
    const data = result.data
    if (
      typeof data !== 'object' ||
      data === null ||
      !('user' in data) ||
      (data.user !== null && typeof data.user !== 'object')
    ) {
      throw new Error('The session endpoint returned an invalid response.')
    }
    return data as SessionResponse
  },

  async logout() {
    const result = await postAuthAction('logout')
    return result
  },
}

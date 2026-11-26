import { apiManager, ApiRequestError } from '@/lib/api/api-manager'
import { AUTH_ENDPOINTS } from '@/lib/auth/auth-endpoints'
import type {
  AccountProfile,
  LoginPayload,
  LoginResponse,
  RegisterPayload,
  SessionResponse,
} from '@/lib/auth/auth-payloads'

function isAccountProfile(value: unknown): value is AccountProfile {
  if (typeof value !== 'object' || value === null) return false

  const profile = value as Record<string, unknown>
  return (
    typeof profile.id === 'string' &&
    typeof profile.firstName === 'string' &&
    typeof profile.lastName === 'string' &&
    typeof profile.email === 'string' &&
    typeof profile.phoneNumber === 'string' &&
    typeof profile.role === 'string' &&
    typeof profile.isActive === 'boolean' &&
    typeof profile.isEmailVerified === 'boolean' &&
    (typeof profile.createdAt === 'string' || profile.createdAt === null) &&
    (typeof profile.updatedAt === 'string' || profile.updatedAt === null) &&
    (typeof profile.lastLoginAt === 'string' || profile.lastLoginAt === null)
  )
}

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

  async getProfile(): Promise<AccountProfile> {
    const result = await apiManager(AUTH_ENDPOINTS.profileProxy)
    if (!result.ok) {
      throw new ApiRequestError(
        `Profile request failed (${result.status}).`,
        result.status,
        result.data
      )
    }

    const data = result.data
    if (
      typeof data !== 'object' ||
      data === null ||
      !('user' in data) ||
      !isAccountProfile(data.user)
    ) {
      throw new Error('The profile endpoint returned an invalid user.')
    }
    return data.user
  },

  async logout() {
    const result = await postAuthAction('logout')
    return result
  },
}

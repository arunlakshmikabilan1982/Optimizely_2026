export type LoginPayload = {
  email: string
  password: string
}

export type RegisterPayload = LoginPayload & {
  firstName: string
  lastName: string
  phoneNumber: string
}

export type AuthUser = {
  name: string | null
  email: string | null
}

export type SessionResponse = {
  user: AuthUser | null
}

export type LoginResponse = {
  user: AuthUser
}

export type AuthErrorResponse = {
  message?: string
  errors?: Array<{ msg?: string }>
}

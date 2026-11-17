import { NextRequest, NextResponse } from 'next/server'
import { authServerService } from '@/lib/auth/auth-server.service'
import type { LoginPayload, RegisterPayload } from '@/lib/auth/auth-payloads'

const TOKEN_COOKIE = 'auth_token'
const USER_COOKIE = 'auth_user'

type AuthAction = 'login' | 'register'
type PublicUser = { name: string | null; email: string | null }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isAuthAction(action: unknown): action is AuthAction {
  return action === 'login' || action === 'register'
}

function getSession(request: NextRequest) {
  const token = request.cookies.get(TOKEN_COOKIE)?.value
  const serializedUser = request.cookies.get(USER_COOKIE)?.value

  if (!token || !serializedUser) {
    return NextResponse.json({ user: null })
  }

  try {
    const user: unknown = JSON.parse(serializedUser)
    if (
      isRecord(user) &&
      (typeof user.name === 'string' || user.name === null) &&
      (typeof user.email === 'string' || user.email === null)
    ) {
      return NextResponse.json({
        user: { name: user.name, email: user.email },
      })
    }
  } catch {
    console.error('The stored authentication profile cookie is invalid.')
  }

  const response = NextResponse.json({ user: null })
  response.cookies.delete(TOKEN_COOKIE)
  response.cookies.delete(USER_COOKIE)
  return response
}

async function handleAuthAction(
  action: AuthAction,
  requestBody: Record<string, unknown>
) {
  const { email, password } = requestBody
  if (
    typeof email !== 'string' ||
    !email.trim() ||
    typeof password !== 'string' ||
    !password
  ) {
    return NextResponse.json(
      { message: 'Email and password are required.' },
      { status: 400 }
    )
  }

  let payload: LoginPayload | RegisterPayload
  if (action === 'register') {
    const { firstName, lastName, phoneNumber } = requestBody
    if (
      typeof firstName !== 'string' ||
      !firstName.trim() ||
      typeof lastName !== 'string' ||
      !lastName.trim() ||
      typeof phoneNumber !== 'string' ||
      !phoneNumber.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          errors: [
            ...(typeof firstName !== 'string' || !firstName.trim()
              ? [
                  {
                    type: 'field',
                    value: typeof firstName === 'string' ? firstName : '',
                    msg: 'First name is required',
                    path: 'firstName',
                    location: 'body',
                  },
                ]
              : []),
            ...(typeof lastName !== 'string' || !lastName.trim()
              ? [
                  {
                    type: 'field',
                    value: typeof lastName === 'string' ? lastName : '',
                    msg: 'Last name is required',
                    path: 'lastName',
                    location: 'body',
                  },
                ]
              : []),
            ...(typeof phoneNumber !== 'string' || !phoneNumber.trim()
              ? [
                  {
                    type: 'field',
                    value: typeof phoneNumber === 'string' ? phoneNumber : '',
                    msg: 'Enter a valid phone number',
                    path: 'phoneNumber',
                    location: 'body',
                  },
                ]
              : []),
          ],
        },
        { status: 400 }
      )
    }
    payload = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phoneNumber: phoneNumber.trim(),
      email: email.trim(),
      password,
    }
  } else {
    payload = { email: email.trim(), password }
  }

  let backendResult
  try {
    backendResult =
      action === 'login'
        ? await authServerService('login', payload)
        : await authServerService('register', payload)
  } catch (error) {
    console.error(`Unable to reach the backend ${action} endpoint.`, error)
    return NextResponse.json(
      {
        message: 'The authentication service is unavailable. Please try again.',
      },
      { status: 502 }
    )
  }

  const { ok, status, data: backendData, text } = backendResult
  if (!ok) {
    if (text && backendData === null) {
      return NextResponse.json({ message: text }, { status })
    }
    return NextResponse.json(
      backendData ?? { message: 'The request could not be completed.' },
      { status }
    )
  }

  if (action === 'register') {
    if (status === 204) {
      return new NextResponse(null, { status: 204 })
    }
    if (text && backendData === null) {
      return new NextResponse(text, {
        status,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      })
    }
    return NextResponse.json(
      backendData ?? { message: 'Registration successful.' },
      { status }
    )
  }

  if (text && backendData === null) {
    console.error('The backend login endpoint returned invalid JSON.')
    return NextResponse.json(
      { message: 'The authentication service returned an invalid response.' },
      { status: 502 }
    )
  }

  if (
    !isRecord(backendData) ||
    typeof backendData.token !== 'string' ||
    !backendData.token ||
    !isRecord(backendData.user)
  ) {
    console.error(
      'The backend login response must include a token and user object.'
    )
    return NextResponse.json(
      { message: 'The authentication service returned an invalid response.' },
      { status: 502 }
    )
  }

  const backendUser = backendData.user
  const name =
    typeof backendUser.name === 'string'
      ? backendUser.name
      : [backendUser.firstName, backendUser.lastName]
          .filter((part): part is string => typeof part === 'string')
          .join(' ') || null
  const user: PublicUser = {
    name,
    email: typeof backendUser.email === 'string' ? backendUser.email : null,
  }
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
  }
  const response = NextResponse.json({ user })
  response.cookies.set(TOKEN_COOKIE, backendData.token, cookieOptions)
  response.cookies.set(USER_COOKIE, JSON.stringify(user), cookieOptions)
  return response
}

export async function GET(request: NextRequest) {
  return getSession(request)
}

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { message: 'A valid JSON body is required.' },
      { status: 400 }
    )
  }

  if (!isRecord(body)) {
    return NextResponse.json(
      { message: 'A valid request body is required.' },
      { status: 400 }
    )
  }

  if (body.action === 'logout') {
    const response = NextResponse.json({ success: true })
    response.cookies.delete(TOKEN_COOKIE)
    response.cookies.delete(USER_COOKIE)
    return response
  }

  if (!isAuthAction(body.action)) {
    return NextResponse.json(
      { message: 'Action must be login, register, or logout.' },
      { status: 400 }
    )
  }

  return handleAuthAction(body.action, body)
}

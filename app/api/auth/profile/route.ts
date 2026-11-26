import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { AUTH_API_BASE_URL } from '@/lib/api/api-base'
import { apiManager } from '@/lib/api/api-manager'
import { AUTH_ENDPOINTS } from '@/lib/auth/auth-endpoints'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNullableString(value: unknown): value is string | null {
  return typeof value === 'string' || value === null
}

export async function GET() {
  const token = (await cookies()).get('auth_token')?.value
  if (!token) {
    return NextResponse.json(
      { message: 'Sign in to view your account.' },
      { status: 401 }
    )
  }

  let result
  try {
    result = await apiManager(
      AUTH_ENDPOINTS.backend.profile,
      { headers: { Authorization: `Bearer ${token}` } },
      AUTH_API_BASE_URL
    )
  } catch (error) {
    console.error('Unable to reach the account profile endpoint.', error)
    return NextResponse.json(
      { message: 'The account service is unavailable. Please try again.' },
      { status: 502 }
    )
  }

  if (!result.ok) {
    return NextResponse.json(
      {
        message:
          result.status === 401
            ? 'Your session has expired. Please sign in again.'
            : 'Unable to load your account profile.',
      },
      { status: result.status === 401 ? 401 : 502 }
    )
  }

  const data = result.data
  const user = isRecord(data) ? data.user : null
  if (
    !isRecord(user) ||
    typeof user._id !== 'string' ||
    typeof user.firstName !== 'string' ||
    typeof user.lastName !== 'string' ||
    typeof user.email !== 'string' ||
    typeof user.phoneNumber !== 'string' ||
    typeof user.role !== 'string' ||
    typeof user.isActive !== 'boolean' ||
    typeof user.isEmailVerified !== 'boolean' ||
    !isNullableString(user.createdAt) ||
    !isNullableString(user.updatedAt) ||
    !isNullableString(user.lastLoginAt)
  ) {
    console.error('The backend returned an invalid account profile.')
    return NextResponse.json(
      { message: 'The account service returned an invalid profile.' },
      { status: 502 }
    )
  }

  return NextResponse.json({
    user: {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role,
      isActive: user.isActive,
      isEmailVerified: user.isEmailVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLoginAt: user.lastLoginAt,
    },
  })
}

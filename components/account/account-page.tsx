'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ApiRequestError } from '@/lib/api/api-manager'
import { authService } from '@/lib/auth/auth-client.service'
import type { AccountProfile } from '@/lib/auth/auth-payloads'

function formatDate(value: string | null): string {
  if (!value) return 'Not available'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Not available' : date.toLocaleString()
}

export default function AccountPage({ locale }: { locale: string }) {
  const router = useRouter()
  const [profile, setProfile] = useState<AccountProfile | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let active = true

    authService
      .getProfile()
      .then((accountProfile) => {
        if (active) setProfile(accountProfile)
      })
      .catch((error: unknown) => {
        console.error('Unable to load the account profile.', error)
        if (!active) return

        if (error instanceof ApiRequestError && error.status === 401) {
          router.replace(`/${locale}/login`)
          return
        }
        setErrorMessage('Unable to load your account details. Please try again.')
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [locale, router])

  return (
    <main className="mx-auto min-h-[70vh] w-full max-w-5xl px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Your Account</h1>
          <p className="mt-1 text-sm text-gray-400">
            Your account information from your profile.
          </p>
        </div>
        <Link
          href={`/${locale}/packages`}
          className="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
        >
          Back to packages
        </Link>
      </div>

      {isLoading ? (
        <p className="rounded-xl border border-white/10 bg-white/5 p-5 text-sm text-gray-300">
          Loading your account...
        </p>
      ) : errorMessage ? (
        <p
          className="rounded-xl border border-red-400/30 bg-red-400/10 p-5 text-sm text-red-200"
          role="alert"
        >
          {errorMessage}
        </p>
      ) : profile ? (
        <section className="rounded-2xl border border-white/10 bg-[#080b1b] p-5 shadow-xl sm:p-8">
          <h2 className="mb-5 text-xl font-semibold">Profile details</h2>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-wide text-gray-400">
                First name
              </dt>
              <dd className="mt-1 text-sm">{profile.firstName}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-gray-400">
                Last name
              </dt>
              <dd className="mt-1 text-sm">{profile.lastName}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-gray-400">
                Email
              </dt>
              <dd className="mt-1 text-sm">{profile.email}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-gray-400">
                Phone number
              </dt>
              <dd className="mt-1 text-sm">{profile.phoneNumber}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-gray-400">
                Account status
              </dt>
              <dd className="mt-1 text-sm">
                {profile.isActive ? 'Active' : 'Inactive'}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-gray-400">
                Email verification
              </dt>
              <dd className="mt-1 text-sm">
                {profile.isEmailVerified ? 'Verified' : 'Not verified'}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-gray-400">
                Account type
              </dt>
              <dd className="mt-1 text-sm">{profile.role}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-gray-400">
                Member since
              </dt>
              <dd className="mt-1 text-sm">{formatDate(profile.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-gray-400">
                Last updated
              </dt>
              <dd className="mt-1 text-sm">{formatDate(profile.updatedAt)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-gray-400">
                Last login
              </dt>
              <dd className="mt-1 text-sm">{formatDate(profile.lastLoginAt)}</dd>
            </div>
          </dl>
        </section>
      ) : null}
    </main>
  )
}

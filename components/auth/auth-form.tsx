'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { ApiRequestError } from '@/lib/api/api-manager'
import { authService } from '@/lib/auth/auth-client.service'

type AuthFormProps = {
  mode: 'login' | 'register'
  locale: string
}

function getErrorMessage(data: unknown): string | null {
  if (typeof data !== 'object' || data === null) {
    return null
  }
  if ('message' in data && typeof data.message === 'string') {
    return data.message
  }
  if ('errors' in data && Array.isArray(data.errors)) {
    const messages = data.errors.flatMap((error: unknown) => {
      if (
        typeof error === 'object' &&
        error !== null &&
        'msg' in error &&
        typeof error.msg === 'string'
      ) {
        return [error.msg]
      }
      return []
    })
    return messages.length ? messages.join('. ') : null
  }
  return null
}

export function AuthForm({ mode, locale }: AuthFormProps) {
  const router = useRouter()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isRegister = mode === 'register'

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)
    setIsSubmitting(true)

    try {
      if (isRegister) {
        await authService.register({
          firstName,
          lastName,
          phoneNumber,
          email,
          password,
        })
        setSuccessMessage('Registration successful. You can now sign in.')
        setPassword('')
        return
      }

      await authService.login({ email, password })
      router.replace(`/${locale}`)
      router.refresh()
    } catch (error) {
      console.error(`Unable to submit the ${mode} form.`, error)
      setErrorMessage(
        error instanceof ApiRequestError
          ? (getErrorMessage(error.responseData) ??
              'Unable to complete your request. Please try again.')
          : 'Unable to reach the authentication service. Please try again.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="mx-auto my-12 w-full max-w-md rounded-2xl border border-white/10 bg-[#080b1b] p-6 text-white shadow-xl sm:p-8">
      <h1 className="text-2xl font-bold">
        {isRegister ? 'Create your account' : 'Sign in'}
      </h1>
      <p className="mt-2 text-sm text-gray-400">
        {isRegister
          ? 'Register to get started.'
          : 'Enter your email and password to continue.'}
      </p>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        {isRegister && (
          <>
            <label className="block space-y-1.5 text-sm font-medium">
              First name
              <input
                autoComplete="given-name"
                className="focus:border-brand-blue w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2.5 text-white focus:outline-none"
                name="firstName"
                onChange={(event) => setFirstName(event.target.value)}
                required
                value={firstName}
              />
            </label>
            <label className="block space-y-1.5 text-sm font-medium">
              Last name
              <input
                autoComplete="family-name"
                className="focus:border-brand-blue w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2.5 text-white focus:outline-none"
                name="lastName"
                onChange={(event) => setLastName(event.target.value)}
                required
                value={lastName}
              />
            </label>
            <label className="block space-y-1.5 text-sm font-medium">
              Phone number
              <input
                autoComplete="tel"
                className="focus:border-brand-blue w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2.5 text-white focus:outline-none"
                name="phoneNumber"
                onChange={(event) => setPhoneNumber(event.target.value)}
                required
                type="tel"
                value={phoneNumber}
              />
            </label>
          </>
        )}
        <label className="block space-y-1.5 text-sm font-medium">
          Email
          <input
            autoComplete="email"
            className="focus:border-brand-blue w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2.5 text-white focus:outline-none"
            name="email"
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
          />
        </label>
        <label className="block space-y-1.5 text-sm font-medium">
          Password
          <input
            autoComplete={isRegister ? 'new-password' : 'current-password'}
            className="focus:border-brand-blue w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2.5 text-white focus:outline-none"
            name="password"
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
        </label>

        {errorMessage && (
          <p className="text-sm text-red-400" role="alert">
            {errorMessage}
          </p>
        )}
        {successMessage && (
          <p className="text-sm text-green-400" role="status">
            {successMessage}
          </p>
        )}

        <button
          className="bg-brand-blue inline-flex w-full items-center justify-center rounded-full px-5 py-3 font-semibold text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting
            ? 'Please wait...'
            : isRegister
              ? 'Create account'
              : 'Sign in'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-400">
        {isRegister ? 'Already have an account?' : 'New here?'}{' '}
        <Link
          className="font-semibold text-blue-300 hover:text-white"
          href={`/${locale}/${isRegister ? 'login' : 'register'}`}
        >
          {isRegister ? 'Sign in' : 'Create an account'}
        </Link>
      </p>
    </section>
  )
}

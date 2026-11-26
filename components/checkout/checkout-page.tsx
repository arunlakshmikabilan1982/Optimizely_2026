'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import {
  ADD_ON_REMOVED_EVENT,
  CART_CLEARED_EVENT,
  SELECTED_ADD_ONS_KEY,
  SELECTED_PACKAGE_KEY,
  type SelectedAddOn,
  type SelectedPackage,
} from '@/components/block/portfolio-grid-block'
import { Icon } from '@/components/ui/Icon'
import {
  formatCardNumber,
  getBillingZipError,
  getCardBrand,
  getCardNumberError,
  getCvvError,
  getExpirationError,
} from '@/lib/utils/payment-validation'

type CheckoutStep = 'cart' | 'checkout' | 'otp' | 'processing' | 'success'
type PaymentMethod = 'card' | 'paypal' | 'apple-pay' | 'google-pay'
type PaymentErrors = Partial<Record<keyof CheckoutFormValues, string>>

type CheckoutFormValues = {
  fullName: string
  email: string
  cardNumber: string
  expiration: string
  cvv: string
  billingZip: string
}

type CheckoutReceipt = {
  transactionId: string
  account: {
    fullName: string
    email: string
  }
  paymentMethod: {
    type: PaymentMethod
    last4?: string
    expiration?: string
  }
  billing: {
    zipCode: string
  }
  securityCodeVerified: boolean
  amountCharged: number
}

interface CheckoutPageProps {
  locale: string
  initialPackage?: SelectedPackage | null
  initialAddOns?: SelectedAddOn[]
  initialStep?: 'cart' | 'checkout'
  zipCode?: string
  cartNotice?: string | null
  onClose?: () => void
}

function isSelectedPackage(value: unknown): value is SelectedPackage {
  if (typeof value !== 'object' || value === null) return false

  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    typeof candidate.priceMonthly === 'number' &&
    typeof candidate.channelsCount === 'string' &&
    Array.isArray(candidate.highlights) &&
    candidate.highlights.every((item) => typeof item === 'string')
  )
}

function isSelectedAddOn(value: unknown): value is SelectedAddOn {
  if (typeof value !== 'object' || value === null) return false

  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    typeof candidate.priceMonthly === 'number' &&
    Number.isFinite(candidate.priceMonthly) &&
    typeof candidate.pricePeriod === 'string'
  )
}

function isSelectedAddOnList(value: unknown): value is SelectedAddOn[] {
  return Array.isArray(value) && value.every(isSelectedAddOn)
}

function isCheckoutReceipt(value: unknown): value is CheckoutReceipt {
  if (typeof value !== 'object' || value === null) return false

  const receipt = value as Record<string, unknown>
  const account = receipt.account
  const paymentMethod = receipt.paymentMethod
  const billing = receipt.billing
  const paymentMethodRecord =
    typeof paymentMethod === 'object' && paymentMethod !== null
      ? (paymentMethod as Record<string, unknown>)
      : null
  const paymentType = paymentMethodRecord?.type
  const validPaymentMethod =
    paymentType === 'card'
      ? typeof paymentMethodRecord?.last4 === 'string' &&
        typeof paymentMethodRecord.expiration === 'string'
      : paymentType === 'paypal' ||
        paymentType === 'apple-pay' ||
        paymentType === 'google-pay'

  return (
    typeof receipt.transactionId === 'string' &&
    typeof account === 'object' &&
    account !== null &&
    'fullName' in account &&
    typeof account.fullName === 'string' &&
    'email' in account &&
    typeof account.email === 'string' &&
    paymentMethodRecord !== null &&
    validPaymentMethod &&
    typeof billing === 'object' &&
    billing !== null &&
    'zipCode' in billing &&
    typeof billing.zipCode === 'string' &&
    typeof receipt.securityCodeVerified === 'boolean' &&
    typeof receipt.amountCharged === 'number'
  )
}

const initialForm: CheckoutFormValues = {
  fullName: '',
  email: '',
  cardNumber: '',
  expiration: '',
  cvv: '',
  billingZip: '',
}

const paymentOptions: { value: PaymentMethod; label: string }[] = [
  { value: 'card', label: 'Credit or Debit Card' },
  { value: 'paypal', label: 'PayPal' },
  { value: 'apple-pay', label: 'Apple Pay' },
  { value: 'google-pay', label: 'Google Pay' },
]
const paymentMethodLabels: Record<PaymentMethod, string> = {
  card: 'Credit or debit card',
  paypal: 'PayPal',
  'apple-pay': 'Apple Pay',
  'google-pay': 'Google Pay',
}

export default function CheckoutPage({
  locale,
  initialPackage = null,
  initialAddOns,
  initialStep = 'checkout',
  zipCode = '90210',
  cartNotice,
  onClose,
}: CheckoutPageProps) {
  const router = useRouter()
  const [isMounted, setIsMounted] = useState(false)
  const [selectedPackage, setSelectedPackage] =
    useState<SelectedPackage | null>(initialPackage)
  const [selectedAddOns, setSelectedAddOns] = useState<SelectedAddOn[]>(
    initialAddOns ?? []
  )
  const [step, setStep] = useState<CheckoutStep>(initialStep)
  const [form, setForm] = useState(initialForm)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card')
  const [paymentErrors, setPaymentErrors] = useState<PaymentErrors>({})
  const [otp, setOtp] = useState('')
  const [receipt, setReceipt] = useState<CheckoutReceipt | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    setIsMounted(true)
    if (initialPackage) return

    try {
      const savedPackage = sessionStorage.getItem(SELECTED_PACKAGE_KEY)
      if (!savedPackage) return

      const parsedPackage: unknown = JSON.parse(savedPackage)
      if (isSelectedPackage(parsedPackage)) {
        setSelectedPackage(parsedPackage)
      } else {
        console.error('The saved package selection has an invalid format.')
      }

      const savedAddOns = sessionStorage.getItem(SELECTED_ADD_ONS_KEY)
      if (savedAddOns) {
        const parsedAddOns: unknown = JSON.parse(savedAddOns)
        if (isSelectedAddOnList(parsedAddOns)) {
          setSelectedAddOns(parsedAddOns)
        } else {
          console.error('The saved add-on selection has an invalid format.')
          sessionStorage.removeItem(SELECTED_ADD_ONS_KEY)
        }
      }
    } catch (error) {
      console.error('Unable to load the saved cart.', error)
    }
  }, [initialPackage])

  useEffect(() => {
    if (initialAddOns) {
      setSelectedAddOns(initialAddOns)
    }
  }, [initialAddOns])

  useEffect(() => {
    const bodyOverflow = document.body.style.overflow
    const htmlOverflow = document.documentElement.style.overflow
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = bodyOverflow
      document.documentElement.style.overflow = htmlOverflow
    }
  }, [])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && step !== 'processing') {
        if (onClose) {
          onClose()
        } else {
          router.push(`/${locale}/packages`)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [locale, onClose, router, step])

  const closeDrawer = () => {
    if (onClose) {
      onClose()
      return
    }

    router.push(`/${locale}/packages`)
  }

  const updateForm = (field: keyof CheckoutFormValues, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
    setPaymentErrors((current) => ({ ...current, [field]: undefined }))
    setErrorMessage(null)
  }

  const clearSavedPackage = () => {
    try {
      sessionStorage.removeItem(SELECTED_PACKAGE_KEY)
      sessionStorage.removeItem(SELECTED_ADD_ONS_KEY)
    } catch (error) {
      console.error('Unable to clear the saved cart.', error)
    }
    window.dispatchEvent(new Event(CART_CLEARED_EVENT))
  }

  const removeSelectedPackage = () => {
    setSelectedPackage(null)
    setSelectedAddOns([])
    clearSavedPackage()
  }

  const removeSelectedAddOn = (id: string) => {
    const updatedAddOns = selectedAddOns.filter((addOn) => addOn.id !== id)
    setSelectedAddOns(updatedAddOns)
    try {
      if (updatedAddOns.length > 0) {
        sessionStorage.setItem(
          SELECTED_ADD_ONS_KEY,
          JSON.stringify(updatedAddOns)
        )
      } else {
        sessionStorage.removeItem(SELECTED_ADD_ONS_KEY)
      }
    } catch (error) {
      console.error('Unable to update selected add-ons.', error)
    }
    window.dispatchEvent(
      new CustomEvent<string>(ADD_ON_REMOVED_EVENT, { detail: id })
    )
  }

  const addOnTotal = selectedAddOns.reduce(
    (total, addOn) => total + addOn.priceMonthly,
    0
  )
  const totalPrice = (selectedPackage?.priceMonthly ?? 0) + addOnTotal
  const formattedTotal = totalPrice.toFixed(2)

  const continueToOtp = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedPackage) return

    const errors: PaymentErrors = {}
    if (!form.fullName.trim()) errors.fullName = 'Enter your full name.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errors.email = 'Enter a valid email address.'
    }
    const billingZipError = getBillingZipError(form.billingZip)
    if (billingZipError) errors.billingZip = billingZipError

    if (paymentMethod === 'card') {
      const cardNumberError = getCardNumberError(form.cardNumber)
      const expirationError = getExpirationError(form.expiration)
      const cvvError = getCvvError(
        form.cvv,
        getCardBrand(form.cardNumber.replace(/\D/g, ''))
      )
      if (cardNumberError) errors.cardNumber = cardNumberError
      if (expirationError) errors.expiration = expirationError
      if (cvvError) errors.cvv = cvvError
    }

    setPaymentErrors(errors)
    if (Object.keys(errors).length > 0) return

    setErrorMessage(null)
    setStep('otp')
  }

  const verifyOtp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedPackage || step === 'processing') return

    setErrorMessage(null)
    setStep('processing')

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          otp,
          amount: totalPrice,
          paymentMethod,
        }),
      })
      const result: unknown = await response.json()

      if (!response.ok) {
        const message =
          typeof result === 'object' &&
          result !== null &&
          'message' in result &&
          typeof result.message === 'string'
            ? result.message
            : 'Payment could not be completed. Please check your details and try again.'
        setErrorMessage(message)
        setStep('otp')
        return
      }

      if (!isCheckoutReceipt(result)) {
        throw new Error('The checkout service returned an invalid receipt.')
      }

      setReceipt(result)
      setStep('success')
      clearSavedPackage()
    } catch (error) {
      console.error('Unable to complete checkout.', error)
      setErrorMessage(
        'We could not connect to checkout. Please try again in a moment.'
      )
      setStep('otp')
    }
  }

  if (!isMounted) return null

  const formattedPrice = selectedPackage?.priceMonthly.toFixed(2) ?? '0.00'

  return createPortal(
    <div className="fixed inset-0 z-[100] flex justify-end">
      <button
        type="button"
        className="fixed inset-0 cursor-default bg-black/70 backdrop-blur-sm"
        onClick={() => step !== 'processing' && closeDrawer()}
        aria-label="Close order summary"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-summary-title"
        onClick={(event) => event.stopPropagation()}
        className="checkout-drawer-scrollbar relative ml-auto flex h-[100dvh] w-full max-w-[500px] flex-col overflow-y-auto border-l border-white/10 bg-[#090e22] p-4 text-white shadow-2xl sm:p-5"
      >
        <header className="mb-4 flex shrink-0 items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <Icon name="shopping-cart" className="h-5 w-5 text-sky-300" />
            <h1
              id="order-summary-title"
              className="text-lg font-bold sm:text-xl"
            >
              {step === 'cart'
                ? 'Your Order Summary'
                : step === 'checkout'
                  ? 'Checkout'
                  : step === 'otp'
                    ? 'Verify OTP'
                    : step === 'processing'
                      ? 'Processing Payment'
                      : 'Payment Successful'}
            </h1>
          </div>
          <button
            type="button"
            onClick={closeDrawer}
            disabled={step === 'processing'}
            className="rounded-full p-1 text-white transition-colors hover:bg-white/10 disabled:opacity-50"
            aria-label="Close order summary"
          >
            <Icon name="x" className="h-5 w-5" />
          </button>
        </header>

        {selectedPackage && step === 'cart' ? (
          <section className="shrink-0">
            <div className="rounded-2xl border border-white/10 bg-[#060a17] p-4">
              <div className="mb-2 flex items-start justify-between gap-3">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wide text-sky-300">
                    Base Package
                  </span>
                  <h2 className="mt-1 text-lg font-bold uppercase">
                    {selectedPackage.name}
                  </h2>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <span className="whitespace-nowrap text-lg font-extrabold">
                    ${formattedPrice}
                    <span className="text-xs font-normal text-gray-400">/mo</span>
                  </span>
                  <button
                    type="button"
                    onClick={removeSelectedPackage}
                    className="text-xs text-gray-400 hover:text-white"
                  >
                    Remove
                  </button>
                </div>
              </div>
              <p className="mb-2 text-xs text-gray-400">
                {selectedPackage.channelsCount.replace(/\s*channels?$/i, '')}{' '}
                Live &amp; On-Demand Channels
              </p>
              <Link
                href={`/${locale}/packages`}
                onClick={closeDrawer}
                className="text-xs text-sky-300 hover:underline"
              >
                Change Base Package &rarr;
              </Link>
            </div>

            <div className="mt-8">
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3 className="text-xs font-semibold text-gray-300">
                  Selected Add-ons ({selectedAddOns.length})
                </h3>
                <Link
                  href={`/${locale}/packages#genre-packs`}
                  onClick={closeDrawer}
                  className="text-xs font-semibold text-sky-300 hover:underline"
                >
                  Browse Add-ons
                </Link>
              </div>
              {selectedAddOns.length > 0 ? (
                <ul className="space-y-2">
                  {selectedAddOns.map((addOn) => (
                    <li
                      key={addOn.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm text-white">
                          {addOn.name}
                        </span>
                        <span className="text-xs text-gray-400">
                          ${addOn.priceMonthly.toFixed(2)} {addOn.pricePeriod}
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => removeSelectedAddOn(addOn.id)}
                        className="shrink-0 text-xs text-gray-400 hover:text-white"
                        aria-label={`Remove ${addOn.name}`}
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="rounded-lg border border-dashed border-white/10 bg-white/5 px-3 py-2 text-center text-xs italic text-gray-400">
                  No genre packs or premium add-ons added yet.
                </p>
              )}
            </div>

            <div className="mt-6 space-y-2 border-t border-white/10 pt-3 text-xs text-green-400">
              <p className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-1.5">
                  <Icon name="check-circle" className="h-4 w-4" />
                  Unlimited Cloud DVR
                </span>
                <strong>INCLUDED</strong>
              </p>
              <p className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-1.5">
                  <Icon name="check-circle" className="h-4 w-4" />
                  Local Channels ({zipCode})
                </span>
                <strong>INCLUDED</strong>
              </p>
            </div>

            <div className="mt-10 border-t border-white/10 pt-3">
              <div className="mb-1 flex items-baseline justify-between gap-3">
                <span className="text-xs text-gray-300">
                  Estimated Monthly Total:
                </span>
                <span className="whitespace-nowrap text-xl font-black">
                  ${formattedTotal}
                  <span className="text-xs font-normal text-gray-400">/mo</span>
                </span>
              </div>
              <p className="text-[11px] leading-snug text-gray-400">
                Plus applicable local sales tax &amp; regulatory fees. No
                long-term contractual commitment needed.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setStep('checkout')}
              className="mt-12 w-full rounded-full bg-[#0875ff] py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/30 transition-colors hover:bg-blue-600"
            >
              Proceed to Express Checkout
            </button>
          </section>
        ) : !selectedPackage ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            {cartNotice && (
              <p className="mb-2 text-sm text-amber-200" role="status">
                {cartNotice}
              </p>
            )}
            <p className="text-sm text-gray-300">
              Your cart is empty.
            </p>
            <Link
              href={`/${locale}/packages`}
              onClick={closeDrawer}
              className="mt-3 inline-flex rounded-full bg-[#0875ff] px-4 py-2 text-sm font-bold hover:bg-blue-600"
            >
              Browse Packages
            </Link>
          </div>
        ) : null}

        {selectedPackage && step !== 'cart' && (
          <div className="mt-4 border-t border-white/10 pt-3">
            {step === 'checkout' && (
              <section>
                <h2 className="mb-2 text-base font-bold">Express Checkout</h2>
                <form
                  id="checkout-form"
                  autoComplete="off"
                  onSubmit={continueToOtp}
                  className="space-y-3 rounded-xl border border-white/10 bg-[#171d30] p-3"
                >
                  <section>
                    <h3 className="mb-2 text-sm font-bold">
                      1. Account Details
                    </h3>
                    <div className="space-y-2">
                      <label className="block text-xs text-gray-300">
                        Full Name
                        <input
                          autoComplete="name"
                          required
                          value={form.fullName}
                          onChange={(event) =>
                            updateForm('fullName', event.target.value)
                          }
                          className="mt-1 w-full rounded-lg border border-white/10 bg-[#070b18] px-3 py-2 text-sm text-white outline-none focus:border-sky-400"
                        />
                      </label>
                      {paymentErrors.fullName && (
                        <p className="text-xs text-red-300" role="alert">
                          {paymentErrors.fullName}
                        </p>
                      )}
                      <label className="block text-xs text-gray-300">
                        Email Address
                        <input
                          type="email"
                          autoComplete="email"
                          required
                          value={form.email}
                          onChange={(event) =>
                            updateForm('email', event.target.value)
                          }
                          className="mt-1 w-full rounded-lg border border-white/10 bg-[#070b18] px-3 py-2 text-sm text-white outline-none focus:border-sky-400"
                        />
                      </label>
                      {paymentErrors.email && (
                        <p className="text-xs text-red-300" role="alert">
                          {paymentErrors.email}
                        </p>
                      )}
                    </div>
                  </section>

                  <section>
                    <h3 className="mb-1.5 text-sm font-bold">
                      2. Payment Method
                    </h3>
                    <p className="mb-2 text-[11px] leading-snug text-amber-200">
                      Demo checkout only. No payment is processed. Do not enter
                      real card details.
                    </p>
                    <fieldset>
                      <legend className="sr-only">Choose a payment method</legend>
                      <div className="grid grid-cols-2 gap-2">
                        {paymentOptions.map((option) => (
                          <label
                            key={option.value}
                            className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs ${
                              paymentMethod === option.value
                                ? 'border-sky-400 bg-sky-400/10 text-white'
                                : 'border-white/10 bg-[#070b18] text-gray-300'
                            }`}
                          >
                            <input
                              type="radio"
                              name="paymentMethod"
                              value={option.value}
                              checked={paymentMethod === option.value}
                              onChange={() => {
                                setPaymentMethod(option.value)
                                setPaymentErrors({})
                                setErrorMessage(null)
                              }}
                            />
                            {option.label}
                          </label>
                        ))}
                      </div>
                    </fieldset>

                    {paymentMethod === 'card' ? (
                      <>
                        <div
                          className="mb-2 mt-3 flex items-center gap-1.5 text-[9px] font-extrabold italic"
                          aria-label="Accepted card networks"
                        >
                          <span className="rounded bg-white px-1.5 py-0.5 text-blue-900">VISA</span>
                          <span className="rounded bg-white px-1.5 py-0.5 text-red-600">Mastercard</span>
                          <span className="rounded bg-white px-1.5 py-0.5 text-sky-800">AMEX</span>
                          <span className="rounded bg-white px-1.5 py-0.5 text-blue-600">DISCOVER</span>
                        </div>
                        <div className="space-y-2">
                          <label className="block text-xs text-gray-300">
                            Card Number
                            {form.cardNumber &&
                              getCardBrand(form.cardNumber.replace(/\D/g, '')) !==
                                'Unknown' &&
                              ` (${getCardBrand(form.cardNumber.replace(/\D/g, ''))})`}
                            <input
                              inputMode="numeric"
                              autoComplete="off"
                              maxLength={23}
                              value={form.cardNumber}
                              aria-invalid={Boolean(paymentErrors.cardNumber)}
                              aria-describedby={
                                paymentErrors.cardNumber
                                  ? 'card-number-error'
                                  : undefined
                              }
                              onChange={(event) => {
                                const digits = event.target.value
                                  .replace(/\D/g, '')
                                  .slice(0, 19)
                                updateForm('cardNumber', formatCardNumber(digits))
                              }}
                              placeholder="•••• •••• •••• ••••"
                              className="mt-1 w-full rounded-lg border border-white/10 bg-[#070b18] px-3 py-2 text-sm text-white outline-none focus:border-sky-400"
                            />
                          </label>
                          {paymentErrors.cardNumber && (
                            <p
                              id="card-number-error"
                              className="text-xs text-red-300"
                              role="alert"
                            >
                              {paymentErrors.cardNumber}
                            </p>
                          )}
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-xs text-gray-300">
                                Expiration
                                <input
                                  inputMode="numeric"
                                  autoComplete="off"
                                  maxLength={5}
                                  value={form.expiration}
                                  aria-invalid={Boolean(paymentErrors.expiration)}
                                  aria-describedby={
                                    paymentErrors.expiration
                                      ? 'expiration-error'
                                      : undefined
                                  }
                                  onChange={(event) => {
                                    const digits = event.target.value
                                      .replace(/\D/g, '')
                                      .slice(0, 4)
                                    updateForm(
                                      'expiration',
                                      digits.length > 2
                                        ? `${digits.slice(0, 2)}/${digits.slice(2)}`
                                        : digits
                                    )
                                  }}
                                  placeholder="MM/YY"
                                  className="mt-1 w-full rounded-lg border border-white/10 bg-[#070b18] px-3 py-2 text-sm text-white outline-none focus:border-sky-400"
                                />
                              </label>
                              {paymentErrors.expiration && (
                                <p
                                  id="expiration-error"
                                  className="mt-1 text-xs text-red-300"
                                  role="alert"
                                >
                                  {paymentErrors.expiration}
                                </p>
                              )}
                            </div>
                            <div>
                              <label className="block text-xs text-gray-300">
                                CVV
                                <input
                                  inputMode="numeric"
                                  autoComplete="off"
                                  maxLength={
                                    getCardBrand(
                                      form.cardNumber.replace(/\D/g, '')
                                    ) === 'American Express'
                                      ? 4
                                      : 3
                                  }
                                  value={form.cvv}
                                  aria-invalid={Boolean(paymentErrors.cvv)}
                                  aria-describedby={
                                    paymentErrors.cvv ? 'cvv-error' : undefined
                                  }
                                  onChange={(event) =>
                                    updateForm(
                                      'cvv',
                                      event.target.value
                                        .replace(/\D/g, '')
                                        .slice(0, 4)
                                    )
                                  }
                                  placeholder="CVV"
                                  className="mt-1 w-full rounded-lg border border-white/10 bg-[#070b18] px-3 py-2 text-sm text-white outline-none focus:border-sky-400"
                                />
                              </label>
                              {paymentErrors.cvv && (
                                <p
                                  id="cvv-error"
                                  className="mt-1 text-xs text-red-300"
                                  role="alert"
                                >
                                  {paymentErrors.cvv}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <p className="mt-3 rounded-lg border border-white/10 bg-[#070b18] p-3 text-xs text-gray-300" role="status">
                        {paymentOptions.find(
                          (option) => option.value === paymentMethod
                        )?.label}{' '}
                        is selected. This demo will simulate the payment method
                        without contacting an external provider.
                      </p>
                    )}

                    <div className="mt-2">
                      <label className="block text-xs text-gray-300">
                        Billing ZIP
                        <input
                          inputMode="numeric"
                          autoComplete="off"
                          maxLength={5}
                          value={form.billingZip}
                          aria-invalid={Boolean(paymentErrors.billingZip)}
                          aria-describedby={
                            paymentErrors.billingZip ? 'billing-zip-error' : undefined
                          }
                          onChange={(event) =>
                            updateForm(
                              'billingZip',
                              event.target.value.replace(/\D/g, '').slice(0, 5)
                            )
                          }
                          className="mt-1 w-full rounded-lg border border-white/10 bg-[#070b18] px-3 py-2 text-sm text-white outline-none focus:border-sky-400"
                        />
                      </label>
                      {paymentErrors.billingZip && (
                        <p
                          id="billing-zip-error"
                          className="mt-1 text-xs text-red-300"
                          role="alert"
                        >
                          {paymentErrors.billingZip}
                        </p>
                      )}
                    </div>
                  </section>

                  {errorMessage && (
                    <p
                      className="rounded-lg border border-red-400/30 bg-red-400/10 p-2 text-xs text-red-300"
                      role="alert"
                    >
                      {errorMessage}
                    </p>
                  )}
                  <button
                    type="submit"
                    className="w-full rounded-full bg-[#0875ff] py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-500/30 transition-colors hover:bg-blue-600"
                  >
                    Complete Purchase • ${formattedTotal}/mo
                  </button>
                </form>
              </section>
            )}

            {step === 'otp' && (
              <section className="rounded-xl border border-white/10 bg-[#171d30] p-5">
                <h2 className="mb-2 text-lg font-bold">
                  Verify Your One-Time Password
                </h2>
                <p className="mb-4 text-sm leading-relaxed text-gray-300">
                  Enter the 6-digit verification code sent to {form.email}.
                </p>
                <form onSubmit={verifyOtp} className="space-y-4">
                  <label className="block text-sm text-gray-300">
                    One-Time Password
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      required
                      maxLength={6}
                      pattern="\d{6}"
                      value={otp}
                      onChange={(event) =>
                        setOtp(
                          event.target.value.replace(/\D/g, '').slice(0, 6)
                        )
                      }
                      className="mt-1.5 w-full rounded-lg border border-white/10 bg-[#070b18] px-3 py-2.5 text-center text-lg tracking-[0.4em] text-white outline-none focus:border-sky-400"
                    />
                  </label>
                  {errorMessage && (
                    <p
                      className="rounded-lg border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-300"
                      role="alert"
                    >
                      {errorMessage}
                    </p>
                  )}
                  <button
                    type="submit"
                    className="w-full rounded-full bg-[#0875ff] py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-500/30 transition-colors hover:bg-blue-600"
                  >
                    Verify OTP &amp; Complete Purchase
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMessage(null)
                      setStep('checkout')
                    }}
                    className="w-full rounded-full border border-white/15 py-3 text-sm font-semibold text-gray-200 transition-colors hover:bg-white/5"
                  >
                    Back to Checkout
                  </button>
                </form>
              </section>
            )}

            {step === 'processing' && (
              <div
                className="flex min-h-40 flex-col items-center justify-center text-center"
                role="status"
                aria-live="polite"
              >
                <span className="mb-4 block h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-white" />
                <p className="text-base font-medium">
                  Processing Secure Payment
                  <br />
                  with DIRECTV...
                </p>
              </div>
            )}

            {step === 'success' && receipt && (
              <section className="rounded-2xl border border-white/10 bg-[#080b18] p-4 text-center">
                <h2 className="text-xl font-extrabold">Welcome to DIRECTV!</h2>
                <Icon
                  name="check-circle"
                  className="mx-auto my-3 h-12 w-12 text-emerald-500"
                />
                <h3 className="mb-3 text-lg font-bold text-emerald-500">
                  Payment Successful
                </h3>
                <dl className="space-y-2 border-y border-white/10 py-3 text-left text-xs">
                  <div className="flex justify-between gap-3">
                    <dt className="text-gray-400">Confirmation #:</dt>
                    <dd className="text-right">{receipt.transactionId}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-gray-400">Package:</dt>
                    <dd>{selectedPackage.name}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-gray-400">Account:</dt>
                    <dd className="text-right">
                      {receipt.account.fullName} ({receipt.account.email})
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-gray-400">Payment Method:</dt>
                    <dd>
                      {receipt.paymentMethod.type === 'card'
                        ? `Card ending in •••• ${receipt.paymentMethod.last4}`
                        : paymentMethodLabels[receipt.paymentMethod.type]}
                    </dd>
                  </div>
                  {receipt.paymentMethod.type === 'card' && (
                    <div className="flex justify-between gap-3">
                      <dt className="text-gray-400">Expiration:</dt>
                      <dd>{receipt.paymentMethod.expiration}</dd>
                    </div>
                  )}
                  <div className="flex justify-between gap-3">
                    <dt className="text-gray-400">Billing ZIP:</dt>
                    <dd>{receipt.billing.zipCode}</dd>
                  </div>
                  {receipt.paymentMethod.type === 'card' && (
                    <div className="flex justify-between gap-3">
                      <dt className="text-gray-400">Security Code:</dt>
                      <dd>
                        {receipt.securityCodeVerified
                          ? 'Verified'
                          : 'Not verified'}
                      </dd>
                    </div>
                  )}
                  <div className="flex justify-between gap-3 border-t border-white/10 pt-2 font-bold">
                    <dt>Total Paid Today:</dt>
                    <dd>${receipt.amountCharged.toFixed(2)}/mo</dd>
                  </div>
                </dl>
                <Link
                  href={`/channels`}
                  onClick={closeDrawer}
                  className="mt-4 flex w-full items-center justify-center rounded-full bg-[#0875ff] px-5 py-3 text-sm font-bold shadow-lg shadow-blue-500/30 transition-colors hover:bg-blue-600"
                >
                  Start Watching Now
                </Link>
              </section>
            )}
          </div>
        )}
      </aside>
    </div>,
    document.body
  )
}

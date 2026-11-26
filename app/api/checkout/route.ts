import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import {
  getBillingZipError,
  getCardBrand,
  getCardNumberError,
  getCvvError,
  getExpirationError,
} from '@/lib/utils/payment-validation'

type CheckoutRequest = {
  fullName: unknown
  email: unknown
  cardNumber: unknown
  expiration: unknown
  cvv: unknown
  billingZip: unknown
  otp: unknown
  amount: unknown
  paymentMethod?: unknown
}

type PaymentMethod = 'card' | 'paypal' | 'apple-pay' | 'google-pay'

function isCheckoutRequest(value: unknown): value is CheckoutRequest {
  return typeof value === 'object' && value !== null
}

function isPaymentMethod(value: unknown): value is PaymentMethod {
  return (
    value === 'card' ||
    value === 'paypal' ||
    value === 'apple-pay' ||
    value === 'google-pay'
  )
}

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { success: false, message: 'Please submit valid checkout details.' },
      { status: 400 }
    )
  }

  if (!isCheckoutRequest(body)) {
    return NextResponse.json(
      { success: false, message: 'Please submit valid checkout details.' },
      { status: 400 }
    )
  }

  const {
    fullName,
    email,
    cardNumber,
    expiration,
    cvv,
    billingZip,
    otp,
    amount,
    paymentMethod,
  } = body
  const selectedPaymentMethod = paymentMethod ?? 'card'
  if (typeof otp !== 'string' || !/^\d{6}$/.test(otp) || otp !== '000000') {
    return NextResponse.json(
      {
        success: false,
        message:
          'Invalid verification code. Please check the code and try again.',
      },
      { status: 400 }
    )
  }

  const normalizedFullName = typeof fullName === 'string' ? fullName.trim() : ''
  const normalizedEmail = typeof email === 'string' ? email.trim() : ''
  const cleanCard =
    typeof cardNumber === 'string' ? cardNumber.replace(/\D/g, '') : ''
  const normalizedExpiration = typeof expiration === 'string' ? expiration : ''
  const normalizedBillingZip = typeof billingZip === 'string' ? billingZip : ''
  const normalizedAmount = typeof amount === 'number' ? amount : Number.NaN
  const cardDetailsValid =
    selectedPaymentMethod !== 'card' ||
    (getCardNumberError(cleanCard) === null &&
      getExpirationError(normalizedExpiration) === null &&
      typeof cvv === 'string' &&
      getCvvError(cvv, getCardBrand(cleanCard)) === null)
  const validDetails =
    isPaymentMethod(selectedPaymentMethod) &&
    normalizedFullName.length > 0 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) &&
    cardDetailsValid &&
    getBillingZipError(normalizedBillingZip) === null &&
    Number.isFinite(normalizedAmount) &&
    normalizedAmount > 0 &&
    normalizedAmount <= 10000

  if (!validDetails) {
    return NextResponse.json(
      {
        success: false,
        message: 'Invalid payment or account details provided.',
      },
      { status: 400 }
    )
  }

  await new Promise((resolve) => setTimeout(resolve, 1500))

  if (selectedPaymentMethod === 'card' && /^0+$/.test(cleanCard)) {
    return NextResponse.json(
      {
        success: false,
        message: 'Card declined by issuing bank. Try another card.',
      },
      { status: 402 }
    )
  }

  return NextResponse.json({
    success: true,
    transactionId: `DTV-${randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase()}`,
    account: {
      fullName: normalizedFullName,
      email: normalizedEmail,
    },
    paymentMethod:
      selectedPaymentMethod === 'card'
        ? {
            type: 'card',
            last4: cleanCard.slice(-4),
            expiration: normalizedExpiration,
          }
        : { type: selectedPaymentMethod },
    billing: {
      zipCode: normalizedBillingZip,
    },
    securityCodeVerified: selectedPaymentMethod === 'card',
    amountCharged: normalizedAmount,
    timestamp: new Date().toISOString(),
  })
}

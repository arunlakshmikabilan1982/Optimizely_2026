import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'

type CheckoutRequest = {
  fullName: unknown
  email: unknown
  cardNumber: unknown
  expiration: unknown
  cvv: unknown
  billingZip: unknown
  otp: unknown
  amount: unknown
}

function isCheckoutRequest(value: unknown): value is CheckoutRequest {
  return typeof value === 'object' && value !== null
}

function isFutureExpiration(expiration: string): boolean {
  const match = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(expiration)
  if (!match) return false

  const month = Number(match[1])
  const year = 2000 + Number(match[2])
  const expirationDate = new Date(year, month)
  const currentMonth = new Date()
  currentMonth.setDate(1)
  currentMonth.setHours(0, 0, 0, 0)
  return expirationDate > currentMonth
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
  } = body
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
  const validDetails =
    normalizedFullName.length > 0 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) &&
    cleanCard.length >= 15 &&
    cleanCard.length <= 19 &&
    isFutureExpiration(normalizedExpiration) &&
    typeof cvv === 'string' &&
    /^\d{3,4}$/.test(cvv) &&
    /^\d{5}$/.test(normalizedBillingZip) &&
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

  if (/^0+$/.test(cleanCard)) {
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
    paymentMethod: {
      type: 'card',
      last4: cleanCard.slice(-4),
      expiration: normalizedExpiration,
    },
    billing: {
      zipCode: normalizedBillingZip,
    },
    securityCodeVerified: true,
    amountCharged: normalizedAmount,
    timestamp: new Date().toISOString(),
  })
}

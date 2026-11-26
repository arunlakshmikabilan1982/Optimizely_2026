export type CardBrand =
  | 'American Express'
  | 'Discover'
  | 'Diners Club'
  | 'JCB'
  | 'Mastercard'
  | 'UnionPay'
  | 'Visa'
  | 'Unknown'

export function getCardBrand(digits: string): CardBrand {
  if (/^3[47]/.test(digits)) return 'American Express'

  const firstSix = Number(digits.slice(0, 6))
  if (
    /^(6011|65|64[4-9])/.test(digits) ||
    (digits.length >= 6 && firstSix >= 622126 && firstSix <= 622925)
  ) {
    return 'Discover'
  }

  const firstTwo = Number(digits.slice(0, 2))
  const firstFour = Number(digits.slice(0, 4))
  if (
    (firstTwo >= 51 && firstTwo <= 55) ||
    (digits.length >= 4 && firstFour >= 2221 && firstFour <= 2720)
  ) {
    return 'Mastercard'
  }

  if (/^(36|38|30[0-5])/.test(digits)) return 'Diners Club'
  if (/^35(2[89]|[3-8]\d)/.test(digits)) return 'JCB'
  if (/^4/.test(digits)) return 'Visa'
  if (/^62/.test(digits)) return 'UnionPay'
  return 'Unknown'
}

function cardLengths(brand: CardBrand): number[] {
  switch (brand) {
    case 'American Express':
      return [15]
    case 'Discover':
      return [16, 19]
    case 'Diners Club':
      return [14]
    case 'JCB':
    case 'UnionPay':
      return [16, 17, 18, 19]
    case 'Mastercard':
      return [16]
    case 'Visa':
      return [13, 16, 19]
    case 'Unknown':
      return []
  }
}

function passesLuhnCheck(digits: string): boolean {
  let sum = 0
  let doubleDigit = false

  for (let index = digits.length - 1; index >= 0; index -= 1) {
    let digit = Number(digits[index])
    if (doubleDigit) {
      digit *= 2
      if (digit > 9) digit -= 9
    }
    sum += digit
    doubleDigit = !doubleDigit
  }

  return sum % 10 === 0
}

export function getCardNumberError(value: string): string | null {
  const digits = value.replace(/\D/g, '')
  const brand = getCardBrand(digits)
  if (brand === 'Unknown') {
    return 'Enter a card number from a supported network.'
  }

  if (!cardLengths(brand).includes(digits.length)) {
    const expectedLengths = cardLengths(brand).join(' or ')
    return `${brand} card numbers must contain ${expectedLengths} digits.`
  }

  if (!passesLuhnCheck(digits)) {
    return 'Check the card number; it does not pass the card number checksum.'
  }
  return null
}

export function formatCardNumber(digits: string): string {
  const brand = getCardBrand(digits)
  if (brand === 'American Express') {
    return [digits.slice(0, 4), digits.slice(4, 10), digits.slice(10, 15)]
      .filter(Boolean)
      .join(' ')
  }

  return digits.match(/.{1,4}/g)?.join(' ') ?? ''
}

export function getExpirationError(value: string): string | null {
  const match = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(value)
  if (!match) return 'Enter a valid expiration date in MM/YY format.'

  const month = Number(match[1])
  const year = 2000 + Number(match[2])
  const expirationMonth = new Date(year, month, 1)
  const currentMonth = new Date()
  currentMonth.setDate(1)
  currentMonth.setHours(0, 0, 0, 0)

  return expirationMonth <= currentMonth
    ? 'The card has expired. Enter a future expiration date.'
    : null
}

export function getCvvError(value: string, brand: CardBrand): string | null {
  const expectedLength = brand === 'American Express' ? 4 : 3
  return new RegExp(`^\\d{${expectedLength}}$`).test(value)
    ? null
    : `Enter the ${expectedLength}-digit security code for this card.`
}

export function getBillingZipError(value: string): string | null {
  return /^\d{5}$/.test(value) ? null : 'Enter a 5-digit billing ZIP code.'
}

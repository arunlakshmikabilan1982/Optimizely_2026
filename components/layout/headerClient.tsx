'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { authService } from '@/lib/auth/auth-client.service'
import type { AuthUser } from '@/lib/auth/auth-payloads'
import {
  ADD_ON_REMOVED_EVENT,
  ADD_ON_SELECTED_EVENT,
  CART_CLEARED_EVENT,
  PACKAGE_SELECTED_EVENT,
  SELECTED_ADD_ONS_KEY,
  SELECTED_PACKAGE_KEY,
  type SelectedAddOn,
  type SelectedPackage,
} from '@/components/block/portfolio-grid-block'
import CheckoutPage from '@/components/checkout/checkout-page'

type NavLink = { label: string; href: string }

type HeaderClientProps = {
  logo: ReactNode
  links: NavLink[]
  ctaHref: string
  ctaText: string
  locale: string
}

type ZipStatus = { ok: boolean; message: string }

function isSelectedPackage(value: unknown): value is SelectedPackage {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const selectedPackage = value as Record<string, unknown>
  return (
    typeof selectedPackage.id === 'string' &&
    typeof selectedPackage.name === 'string' &&
    typeof selectedPackage.popular === 'boolean' &&
    typeof selectedPackage.priceMonthly === 'number' &&
    typeof selectedPackage.channelsCount === 'string' &&
    typeof selectedPackage.description === 'string' &&
    Array.isArray(selectedPackage.highlights) &&
    selectedPackage.highlights.every(
      (highlight) => typeof highlight === 'string'
    )
  )
}

function isSelectedAddOn(value: unknown): value is SelectedAddOn {
  if (typeof value !== 'object' || value === null) return false

  const addOn = value as Record<string, unknown>
  return (
    typeof addOn.id === 'string' &&
    typeof addOn.name === 'string' &&
    typeof addOn.priceMonthly === 'number' &&
    Number.isFinite(addOn.priceMonthly) &&
    typeof addOn.pricePeriod === 'string'
  )
}

function isSelectedAddOnList(value: unknown): value is SelectedAddOn[] {
  return Array.isArray(value) && value.every(isSelectedAddOn)
}

function MapPinIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}

function BagIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <path d="M3 6h18" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  )
}

function ProfileIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M5 21a7 7 0 0 1 14 0" />
    </svg>
  )
}

function MenuIcon({ open, className }: { open: boolean; className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      aria-hidden="true"
    >
      {open ? (
        <path d="M6 6l12 12M18 6 6 18" />
      ) : (
        <path d="M4 7h16M4 12h16M4 17h16" />
      )}
    </svg>
  )
}

export function HeaderClient({
  logo,
  links,
  ctaHref,
  ctaText,
  locale,
}: HeaderClientProps) {
  const pathname = usePathname()
  const router = useRouter()

  const [zipCode, setZipCode] = useState('90210')
  const [tempZip, setTempZip] = useState('90210')
  const [isZipModalOpen, setIsZipModalOpen] = useState(false)
  const [zipStatus, setZipStatus] = useState<ZipStatus | null>(null)

  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const [selectedPackage, setSelectedPackage] =
    useState<SelectedPackage | null>(null)
  const [selectedAddOns, setSelectedAddOns] = useState<SelectedAddOn[]>([])
  const [cartNotice, setCartNotice] = useState<string | null>(null)
  const selectedPackageRef = useRef<SelectedPackage | null>(null)
  const selectedAddOnsRef = useRef<SelectedAddOn[]>([])
  const cartCount = (selectedPackage ? 1 : 0) + selectedAddOns.length

  const updateSelectedAddOns = (addOns: SelectedAddOn[]) => {
    selectedAddOnsRef.current = addOns
    setSelectedAddOns(addOns)
    try {
      if (addOns.length > 0) {
        sessionStorage.setItem(SELECTED_ADD_ONS_KEY, JSON.stringify(addOns))
      } else {
        sessionStorage.removeItem(SELECTED_ADD_ONS_KEY)
      }
    } catch (error) {
      console.error('Unable to save selected add-ons.', error)
    }
  }

  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)
  const [authMessage, setAuthMessage] = useState<string | null>(null)

  useEffect(() => {
    try {
      const savedPackage = sessionStorage.getItem(SELECTED_PACKAGE_KEY)
      if (savedPackage) {
        const parsedPackage: unknown = JSON.parse(savedPackage)
        if (isSelectedPackage(parsedPackage)) {
          selectedPackageRef.current = parsedPackage
          setSelectedPackage(parsedPackage)
        } else {
          console.error('The saved package selection has an invalid format.')
          sessionStorage.removeItem(SELECTED_PACKAGE_KEY)
        }
      }

      const savedAddOns = sessionStorage.getItem(SELECTED_ADD_ONS_KEY)
      if (savedAddOns) {
        const parsedAddOns: unknown = JSON.parse(savedAddOns)
        if (
          selectedPackageRef.current &&
          isSelectedAddOnList(parsedAddOns)
        ) {
          selectedAddOnsRef.current = parsedAddOns
          setSelectedAddOns(parsedAddOns)
        } else {
          console.error('The saved add-on selection has an invalid format.')
          sessionStorage.removeItem(SELECTED_ADD_ONS_KEY)
        }
      }
    } catch (error) {
      console.error('Unable to restore the saved cart.', error)
    }

    const handlePackageSelected = (event: Event) => {
      const detail = (event as CustomEvent<unknown>).detail
      if (!isSelectedPackage(detail)) {
        console.error('The selected package event has an invalid format.')
        return
      }

      selectedPackageRef.current = detail
      setSelectedPackage(detail)
      setCartNotice(null)
      setIsCartOpen(true)
    }

    const handleAddOnSelected = (event: Event) => {
      const detail = (event as CustomEvent<unknown>).detail
      if (!isSelectedAddOn(detail)) {
        console.error('The selected add-on event has an invalid format.')
        return
      }

      if (!selectedPackageRef.current) {
        setCartNotice('Select a base package before adding genre packs.')
        setIsCartOpen(true)
        return
      }

      const currentAddOns = selectedAddOnsRef.current
      if (!currentAddOns.some((addOn) => addOn.id === detail.id)) {
        updateSelectedAddOns([...currentAddOns, detail])
      }
      setCartNotice(null)
      setIsCartOpen(true)
    }

    const handleAddOnRemoved = (event: Event) => {
      const id = (event as CustomEvent<unknown>).detail
      if (typeof id !== 'string') {
        console.error('The removed add-on event has an invalid format.')
        return
      }

      updateSelectedAddOns(
        selectedAddOnsRef.current.filter((addOn) => addOn.id !== id)
      )
    }

    const handleCartCleared = () => {
      selectedPackageRef.current = null
      setSelectedPackage(null)
      updateSelectedAddOns([])
      setCartNotice(null)
    }

    window.addEventListener(PACKAGE_SELECTED_EVENT, handlePackageSelected)
    window.addEventListener(ADD_ON_SELECTED_EVENT, handleAddOnSelected)
    window.addEventListener(ADD_ON_REMOVED_EVENT, handleAddOnRemoved)
    window.addEventListener(CART_CLEARED_EVENT, handleCartCleared)
    return () => {
      window.removeEventListener(PACKAGE_SELECTED_EVENT, handlePackageSelected)
      window.removeEventListener(ADD_ON_SELECTED_EVENT, handleAddOnSelected)
      window.removeEventListener(ADD_ON_REMOVED_EVENT, handleAddOnRemoved)
      window.removeEventListener(CART_CLEARED_EVENT, handleCartCleared)
    }
  }, [])

  useEffect(() => {
    let active = true

    authService
      .getSession()
      .then(({ user }) => {
        if (active) {
          setAuthUser(user)
          setAuthMessage(null)
        }
      })
      .catch((error: unknown) => {
        console.error('Unable to load the authentication session.', error)
        if (active) {
          setAuthMessage('Account status is unavailable.')
        }
      })

    return () => {
      active = false
    }
  }, [pathname])

  // Close menus on route change
  useEffect(() => {
    setIsMenuOpen(false)
    setIsProfileMenuOpen(false)
  }, [pathname])

  // Close modals on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsZipModalOpen(false)
        setIsCartOpen(false)
        setIsProfileMenuOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const isActive = (href: string) =>
    href === '/'
      ? pathname === '/'
      : pathname === href || pathname?.startsWith(`${href}/`)

  const submitZip = (e: React.FormEvent) => {
    e.preventDefault()
    if (!/^\d{5}$/.test(tempZip)) {
      setZipStatus({
        ok: false,
        message: 'Please enter a valid 5-digit ZIP code.',
      })
      return
    }
    setZipCode(tempZip)
    setZipStatus({
      ok: true,
      message: `Showing channels available in ${tempZip}.`,
    })
    setTimeout(() => {
      setIsZipModalOpen(false)
      setZipStatus(null)
    }, 900)
  }

  const signOut = async () => {
    try {
      await authService.logout()
      setAuthUser(null)
      setIsProfileMenuOpen(false)
      setAuthMessage(null)
      router.replace(`/${locale}/login`)
    } catch (error) {
      console.error('Unable to sign out.', error)
      setAuthMessage('Unable to sign out. Please try again.')
    }
  }

  const authControls = !authUser ? (
    <Link
      href={`/${locale}/login`}
      className="bg-brand-blue shadow-brand-blue/30 focus-visible-custom inline-flex items-center justify-center rounded-full px-5 py-2 text-sm font-semibold text-white shadow-md transition-all hover:bg-blue-600"
    >
      Sign In
    </Link>
  ) : null

  return (
    <>
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <div className="flex items-center gap-8">
          {logo}
          <nav
            className="hidden items-center space-x-1 md:flex lg:space-x-2"
            aria-label="Main"
          >
            {links.map((item) => (
              <Link
                key={`${item.href}-${item.label}`}
                href={item.href}
                aria-current={isActive(item.href) ? 'page' : undefined}
                className={`focus-visible-custom rounded-full px-3 py-1.5 text-sm font-medium transition-all ${
                  isActive(item.href)
                    ? 'bg-brand-blue shadow-brand-blue/30 text-white shadow-lg'
                    : 'text-gray-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setTempZip(zipCode)
              setIsZipModalOpen(true)
            }}
            className="bg-brand-deepNavy hover:border-brand-blue focus-visible-custom flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-xs text-gray-200 transition-colors lg:text-sm"
            title="Check local channel availability"
          >
            <MapPinIcon className="text-brand-accent h-4 w-4" />
            <span>
              Zip: <strong className="text-white">{zipCode}</strong>
            </span>
          </button>
          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="focus-visible-custom relative rounded-full border border-white/10 bg-white/5 p-2 transition-colors hover:bg-white/10"
            aria-label="View Order Summary"
          >
            <BagIcon className="h-5 w-5 text-white" />
            <span className="bg-brand-blue absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-black text-[10px] font-bold text-white">
              {cartCount}
            </span>
          </button>

          <Link
            href={ctaHref}
            className="bg-brand-blue shadow-brand-blue/30 focus-visible-custom hidden items-center justify-center rounded-full px-5 py-2 text-sm font-semibold text-white shadow-md transition-all hover:bg-blue-600 sm:inline-flex"
          >
            {ctaText}
          </Link>
          {authUser ? (
            <div
              className="relative"
              onMouseEnter={() => setIsProfileMenuOpen(true)}
              onMouseLeave={() => setIsProfileMenuOpen(false)}
            >
              <button
                type="button"
                onClick={() => setIsProfileMenuOpen((open) => !open)}
                className="focus-visible-custom flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white transition-colors hover:bg-white/10"
                aria-label="Toggle profile menu"
                aria-expanded={isProfileMenuOpen}
                aria-haspopup="menu"
              >
                <ProfileIcon className="h-5 w-5" />
              </button>
              {isProfileMenuOpen && (
                <div
                  role="menu"
                  aria-label="Profile and site navigation"
                  className="absolute right-0 top-full z-50 w-60 rounded-xl border border-white/10 bg-[#090e22] p-2 text-white shadow-2xl"
                >
                  <div className="border-b border-white/10 px-3 py-2">
                    <p className="truncate text-sm font-semibold">
                      {authUser.name || 'My account'}
                    </p>
                    {authUser.email && (
                      <p className="truncate text-xs text-gray-400">
                        {authUser.email}
                      </p>
                    )}
                  </div>
                  <Link
                    href={`/${locale}/account`}
                    role="menuitem"
                    onClick={() => setIsProfileMenuOpen(false)}
                    className="block rounded-lg px-3 py-2 text-sm font-semibold text-sky-300 hover:bg-white/5 hover:text-white"
                  >
                    Profile
                  </Link>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setTempZip(zipCode)
                      setIsZipModalOpen(true)
                      setIsProfileMenuOpen(false)
                    }}
                    className="block w-full rounded-lg px-3 py-2 text-left text-sm text-gray-200 hover:bg-white/5 hover:text-white"
                  >
                    Check availability (ZIP)
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setIsCartOpen(true)
                      setIsProfileMenuOpen(false)
                    }}
                    className="block w-full rounded-lg px-3 py-2 text-left text-sm text-gray-200 hover:bg-white/5 hover:text-white"
                  >
                    Order summary ({cartCount})
                  </button>
                  {links.map((item) => (
                    <Link
                      key={`profile-${item.href}-${item.label}`}
                      href={item.href}
                      role="menuitem"
                      onClick={() => setIsProfileMenuOpen(false)}
                      className="block rounded-lg px-3 py-2 text-sm text-gray-200 hover:bg-white/5 hover:text-white"
                    >
                      {item.label}
                    </Link>
                  ))}
                  <Link
                    href={ctaHref}
                    role="menuitem"
                    onClick={() => setIsProfileMenuOpen(false)}
                    className="block rounded-lg px-3 py-2 text-sm text-gray-200 hover:bg-white/5 hover:text-white"
                  >
                    {ctaText}
                  </Link>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={signOut}
                    className="mt-1 block w-full rounded-lg border-t border-white/10 px-3 py-2 text-left text-sm text-gray-300 hover:bg-white/5 hover:text-white"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="hidden items-center gap-3 sm:flex">{authControls}</div>
          )}

          <button
            type="button"
            onClick={() => setIsMenuOpen((v) => !v)}
            className="focus-visible-custom rounded-full border border-white/10 bg-white/5 p-2 text-white md:hidden"
            aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMenuOpen}
          >
            <MenuIcon open={isMenuOpen} className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      {isMenuOpen && (
        <nav
          className="mx-auto mt-3 flex max-w-7xl flex-col gap-1 border-t border-white/10 pt-3 md:hidden"
          aria-label="Mobile"
        >
          {links.map((item) => (
            <Link
              key={`m-${item.href}-${item.label}`}
              href={item.href}
              className={`rounded-lg px-3 py-2 text-sm font-medium ${
                isActive(item.href)
                  ? 'bg-brand-blue text-white'
                  : 'text-gray-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              {item.label}
            </Link>
          ))}
          <Link
            href={ctaHref}
            className="bg-brand-blue mt-2 inline-flex items-center justify-center rounded-full px-5 py-2 text-sm font-semibold text-white sm:hidden"
          >
            {ctaText}
          </Link>
          {authUser ? (
            <div className="mt-2 flex flex-col gap-1 border-t border-white/10 pt-2">
              <Link
                href={`/${locale}/account`}
                className="rounded-lg px-3 py-2 text-sm font-semibold text-sky-300 hover:bg-white/5"
              >
                Profile
              </Link>
              <button
                type="button"
                onClick={signOut}
                className="rounded-lg px-3 py-2 text-left text-sm text-gray-300 hover:bg-white/5 hover:text-white"
              >
                Sign out
              </button>
            </div>
          ) : (
            <div className="mt-2 flex items-center gap-3 px-3 py-2 sm:hidden">
              {authControls}
            </div>
          )}
        </nav>
      )}
      {authMessage && (
        <p
          className="mx-auto max-w-7xl px-4 pt-2 text-right text-xs text-red-400"
          role="status"
        >
          {authMessage}
        </p>
      )}

      {/* ZIP modal */}
      {isZipModalOpen && (
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-md"
            role="dialog"
            aria-modal="true"
            aria-labelledby="zip-title"
            onClick={() => setIsZipModalOpen(false)}
          >
            <form
              onSubmit={submitZip}
              onClick={(e) => e.stopPropagation()}
              className="bg-brand-deepNavy w-full max-w-sm rounded-2xl border border-white/15 p-6 shadow-2xl"
            >
              <h2 id="zip-title" className="text-lg font-bold text-white">
                Check channel availability
              </h2>
              <p className="mt-1 text-sm text-gray-400">
                Enter your ZIP code to see local channels.
              </p>
              <input
                autoFocus
                inputMode="numeric"
                maxLength={5}
                value={tempZip}
                onChange={(e) => setTempZip(e.target.value.replace(/\D/g, ''))}
                className="focus:border-brand-blue mt-4 w-full rounded-lg border border-white/15 bg-black/60 px-3 py-2 text-white focus:outline-none"
                aria-label="ZIP code"
              />
              {zipStatus && (
                <p
                  className={`mt-2 text-sm ${zipStatus.ok ? 'text-green-400' : 'text-red-400'}`}
                  role="status"
                >
                  {zipStatus.message}
                </p>
              )}
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsZipModalOpen(false)}
                  className="rounded-full px-4 py-2 text-sm text-gray-300 hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-brand-blue rounded-full px-5 py-2 text-sm font-semibold text-white hover:bg-blue-600"
                >
                  Check
                </button>
              </div>
            </form>
          </div>,
          document.body
        )
      )}

      {isCartOpen && (
        <CheckoutPage
          locale={locale}
          initialPackage={selectedPackage}
          initialAddOns={selectedAddOns}
          initialStep="cart"
          zipCode={zipCode}
          cartNotice={cartNotice}
          onClose={() => setIsCartOpen(false)}
        />
      )}
    </>
  )
}

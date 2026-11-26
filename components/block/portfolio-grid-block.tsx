'use client'

import { useState } from 'react'
import {
  PortfolioChannelsIncluded,
  PortfolioGridBlock as PortfolioGridBlockProps,
  PortfolioItemBlock,
} from '@/lib/optimizely/types/generated'
import { castContent, SafeContent } from '@/lib/optimizely/types/typeUtils'
import { Icon } from '../ui/Icon'

export interface SelectedPackage {
  id: string
  name: string
  popular: boolean
  priceMonthly: number
  channelsCount: string
  description: string
  highlights: string[]
}

export interface SelectedAddOn {
  id: string
  name: string
  priceMonthly: number
  pricePeriod: string
}

export const SELECTED_PACKAGE_KEY = 'selectedBasePackage'
export const SELECTED_ADD_ONS_KEY = 'selectedAddOns'
export const PACKAGE_SELECTED_EVENT = 'package-selected'
export const ADD_ON_SELECTED_EVENT = 'addon-selected'
export const ADD_ON_REMOVED_EVENT = 'addon-removed'
export const CART_CLEARED_EVENT = 'cart-cleared'

export default function PortfolioGridBlock({
  title,
  description,
  items,
}: PortfolioGridBlockProps) {
  const [selectedPackage, setSelectedPackage] = useState<SelectedPackage | null>(null)

  const handleSelect = (pkg: SelectedPackage) => {
    setSelectedPackage(pkg)
    try {
      sessionStorage.setItem(SELECTED_PACKAGE_KEY, JSON.stringify(pkg))
    } catch (error) {
      console.error('Unable to save the selected package.', error)
    }
    window.dispatchEvent(
      new CustomEvent<SelectedPackage>(PACKAGE_SELECTED_EVENT, {
        detail: pkg,
      }),
    )
  }

  return (
    <section className="relative isolate left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen bg-black px-4 py-16 text-white before:absolute before:inset-0 before:-z-10 before:bg-gradient-to-br before:from-[#050917] before:via-black before:to-[#0b1745] before:content-[''] lg:px-8">
      <div className="mx-auto mb-12 max-w-2xl text-center">
        <h2 className="mb-3 text-3xl font-black text-white md:text-4xl">{title}</h2>
        <p className="text-sm text-gray-300">{description}</p>
      </div>

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {items?.map((item, index) => {
          const portfolioItem = item ? { ...item, __typename: 'PortfolioItemBlock' } : null
          const pkgItem = castContent<PortfolioItemBlock>(
            portfolioItem as SafeContent,
            'PortfolioItemBlock',
          )
          if (!pkgItem) return null

          const channelNames: string[] = (pkgItem.channelsIncludedList ?? [])
            .map((c) => {
              const channelItem = c ? { ...c, __typename: 'portfolioChannelsIncluded' } : null
              return castContent<PortfolioChannelsIncluded>(
                channelItem as SafeContent,
                'portfolioChannelsIncluded',
              )?.channels
            })
            .filter((name): name is string => Boolean(name))

          const monthlyPriceText = String(pkgItem.monthlyPrices ?? '').match(
            /\d[\d,]*(?:\.\d+)?/,
          )?.[0]

          const pkg: SelectedPackage = {
            id: String(pkgItem.title ?? index).toLowerCase().replace(/\s+/g, '-'),
            name: String(pkgItem.title ?? ''),
            popular: Boolean(pkgItem.isPopular),
            priceMonthly: monthlyPriceText
              ? Number(monthlyPriceText.replace(/,/g, ''))
              : 0,
            channelsCount: String(pkgItem.channelsCount ?? ''),
            description: String(pkgItem.description ?? ''),
            highlights: channelNames,
          }
          const isSelected = selectedPackage?.id === pkg.id

          return (
            <div
              key={index}
              className={`relative flex h-full flex-col rounded-2xl border p-6 text-white shadow-lg transition-all duration-300 hover:-translate-y-1 hover:border-blue-500 hover:bg-[#00132d] hover:shadow-xl hover:shadow-blue-950/40 ${
                isSelected
                  ? 'border-blue-500 bg-[#00132d] shadow-xl shadow-blue-950/40'
                  : 'border-white/10 bg-[#080b1b] shadow-black/20'
              }`}
            >
              {pkgItem.isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#006dff] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-md">
                  Most Popular
                </div>
              )}

              <div>
                <h3 className="mb-1 text-xl font-black text-white">{pkgItem?.title}</h3>
                <p className="mb-4 min-h-[36px] text-xs text-gray-300">{pkgItem?.description}</p>

                <div className="mb-6 border-b border-white/10 pb-4">
                  <span className="text-4xl font-black text-white">{pkgItem?.monthlyPrices}</span>
                  <span className="text-xs text-gray-400">{pkgItem?.pricePeriod}</span>
                  <div className="mt-1 text-[11px] font-medium text-gray-400">
                    {pkgItem?.channelsCount} 
                  </div>
                </div>

                <ul className="mb-6 space-y-3 text-xs text-gray-200">
                  {channelNames.map((name, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-sky-300" />
                      <span>{name}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={() => handleSelect(pkg)}
                className={`mt-auto w-full rounded-full py-3 text-xs font-bold transition-all focus-visible-custom ${
                  isSelected
                    ? 'bg-[#006dff] text-white shadow-lg shadow-blue-900/40 hover:bg-blue-600'
                    : 'bg-[#202432] text-white hover:bg-[#006dff] hover:shadow-lg hover:shadow-blue-900/40'
                }`}
              >
                Select {pkgItem.title}
              </button>
            </div>
          )
        })}
      </div>
    </section>
  )
}
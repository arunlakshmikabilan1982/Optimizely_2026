import CheckoutPage from '@/components/checkout/checkout-page'

export default async function CheckoutRoute({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  return <CheckoutPage locale={locale} />
}

import AccountPage from '@/components/account/account-page'

export default async function AccountRoute({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  return <AccountPage locale={locale} />
}

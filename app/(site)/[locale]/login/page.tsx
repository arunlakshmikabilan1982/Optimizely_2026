import { AuthForm } from '@/components/auth/auth-form'

export default async function LoginPage(props: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await props.params
  return <AuthForm locale={locale} mode="login" />
}

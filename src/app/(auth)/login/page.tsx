import { AuthForm } from '@/components/auth/auth-form'

export const metadata = {
  title: 'Sign In — Meridian',
}

interface LoginPageProps {
  searchParams: Promise<{ error?: string }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams
  const error =
    params.error === 'invalid_token'
      ? 'The verification link is invalid. Please try again.'
      : params.error === 'expired_link'
      ? 'This link has already been used or has expired. Please request a new one.'
      : params.error === 'session_expired'
      ? 'Your reset link has expired. Request a new one below.'
      : undefined

  return (
    <AuthForm
      initialError={error}
      initialMode={params.error === 'session_expired' ? 'forgot-password' : undefined}
    />
  )
}

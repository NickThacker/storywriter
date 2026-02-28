import { AuthForm } from '@/components/auth/auth-form'

export const metadata = {
  title: 'Sign In — StoryWriter',
}

interface LoginPageProps {
  searchParams: Promise<{ error?: string }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams
  const error =
    params.error === 'invalid_token'
      ? 'The verification link is invalid or has expired. Please try again.'
      : undefined

  return <AuthForm initialError={error} />
}

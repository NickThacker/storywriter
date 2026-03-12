import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ResetPasswordForm } from '@/components/auth/reset-password-form'

export const metadata = {
  title: 'Reset Password — Meridian',
}

export default async function ResetPasswordPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?error=session_expired')
  }

  return <ResetPasswordForm />
}

'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  loginSchema,
  signUpSchema,
  resetPasswordSchema,
  updatePasswordSchema,
} from '@/lib/validations/auth'

export async function signIn(
  prevState: { error?: string } | null,
  formData: FormData
): Promise<{ error: string } | never> {
  const raw = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const parsed = loginSchema.safeParse(raw)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? 'Invalid input'
    return { error: firstError }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })

  if (error) {
    return { error: error.message }
  }

  redirect('/dashboard')
}

export async function signUp(
  prevState: { error?: string; success?: string } | null,
  formData: FormData
): Promise<{ error: string } | { success: string }> {
  const raw = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    confirmPassword: formData.get('confirmPassword') as string,
  }

  const parsed = signUpSchema.safeParse(raw)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? 'Invalid input'
    return { error: firstError }
  }

  const supabase = await createClient()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${siteUrl}/auth/confirm`,
    },
  })

  if (error) {
    return { error: error.message }
  }

  // Create user_settings row for the new user
  // Per research Open Question 4: create in signup action, not DB trigger
  if (data.user) {
    const { error: settingsError } = await supabase
      .from('user_settings')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .insert({
        user_id: data.user.id,
        openrouter_vault_id: null,
        subscription_tier: 'none',
      } as any)

    if (settingsError) {
      // Non-fatal: user was created, settings row failed.
      // Log for debugging but don't block the success response.
      console.error('Failed to create user_settings row:', settingsError.message)
    }
  }

  return { success: 'Check your email to confirm your account' }
}

export async function signOut(): Promise<never> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function resetPassword(
  prevState: { error?: string; success?: string } | null,
  formData: FormData
): Promise<{ error: string } | { success: string }> {
  const raw = {
    email: formData.get('email') as string,
  }

  const parsed = resetPasswordSchema.safeParse(raw)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? 'Invalid input'
    return { error: firstError }
  }

  const supabase = await createClient()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${siteUrl}/auth/confirm?next=/auth/reset-password`,
  })

  if (error) {
    return { error: error.message }
  }

  return { success: 'Password reset email sent — check your inbox' }
}

export async function updatePassword(
  prevState: { error?: string } | null,
  formData: FormData
): Promise<{ error: string } | never> {
  const raw = {
    password: formData.get('password') as string,
    confirmPassword: formData.get('confirmPassword') as string,
  }

  const parsed = updatePasswordSchema.safeParse(raw)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? 'Invalid input'
    return { error: firstError }
  }

  const supabase = await createClient()

  // Verify user is authenticated before allowing password update
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: 'You must be logged in to update your password' }
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  })

  if (error) {
    return { error: error.message }
  }

  redirect('/dashboard')
}

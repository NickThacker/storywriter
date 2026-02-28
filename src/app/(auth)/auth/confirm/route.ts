import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { EmailOtpType } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/dashboard'

  if (!tokenHash || !type) {
    return NextResponse.redirect(`${origin}/login?error=invalid_token`)
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.verifyOtp({
    type,
    token_hash: tokenHash,
  })

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=invalid_token`)
  }

  // Redirect to the next page (defaults to /dashboard, or /auth/reset-password for password resets)
  return NextResponse.redirect(`${origin}${next}`)
}

import { type NextRequest, NextResponse } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next')

  // ── PKCE flow ────────────────────────────────────────────────────────────────
  // Supabase verifies the token on their end and redirects here with a `code`.
  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      return NextResponse.redirect(`${origin}/login?error=expired_link`)
    }
    const defaultNext = type === 'recovery' ? '/auth/reset-password' : '/dashboard'
    return NextResponse.redirect(`${origin}${next ?? defaultNext}`)
  }

  // ── OTP / token_hash flow ────────────────────────────────────────────────────
  // Forward to client-side verify page so email scanners can't consume the token.
  if (tokenHash && type) {
    const params = new URLSearchParams({ token_hash: tokenHash, type })
    if (next) params.set('next', next)
    return NextResponse.redirect(`${origin}/auth/verify?${params}`)
  }

  return NextResponse.redirect(`${origin}/login?error=invalid_token`)
}

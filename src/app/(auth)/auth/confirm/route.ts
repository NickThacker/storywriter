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
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      return NextResponse.redirect(`${origin}/login?error=expired_link`)
    }
    // Detect recovery flow by inspecting the AMR (Authentication Method Reference)
    // claims in the JWT. Supabase strips query params during PKCE redirect, so
    // `type` and `next` are unreliable — the JWT is the source of truth.
    let isRecovery = type === 'recovery' || next === '/auth/reset-password'
    if (!isRecovery && data.session?.access_token) {
      try {
        const payload = JSON.parse(
          Buffer.from(data.session.access_token.split('.')[1], 'base64url').toString()
        )
        const amr = payload.amr
        if (Array.isArray(amr)) {
          isRecovery = amr.some((entry: { method?: string } | string) =>
            typeof entry === 'string' ? entry === 'recovery' : entry.method === 'recovery'
          )
        }
      } catch {
        // JWT decode failed — fall through to default behavior
      }
    }
    const defaultNext = isRecovery ? '/auth/reset-password' : '/dashboard'
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

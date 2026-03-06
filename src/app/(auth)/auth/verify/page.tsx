'use client'

import { useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { EmailOtpType } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

/**
 * Client-side OTP verification page. The server-side /auth/confirm route
 * forwards here without consuming the token, so email security scanners
 * (which don't execute JS) can't pre-emptively invalidate the link.
 */
export default function VerifyPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const called = useRef(false)

  useEffect(() => {
    if (called.current) return
    called.current = true

    const tokenHash = searchParams.get('token_hash')
    const type = searchParams.get('type') as EmailOtpType | null
    const next = searchParams.get('next')

    if (!tokenHash || !type) {
      router.replace('/login?error=invalid_token')
      return
    }

    const supabase = createClient()
    supabase.auth
      .verifyOtp({ type, token_hash: tokenHash })
      .then(({ error }) => {
        if (error) {
          router.replace('/login?error=expired_link')
        } else if (type === 'recovery') {
          router.replace(next ?? '/auth/reset-password')
        } else {
          router.replace(next ?? '/dashboard')
        }
      })
  }, [router, searchParams])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-3">
        <div className="h-6 w-6 border-2 border-border border-t-foreground rounded-full animate-spin mx-auto" />
        <p className="text-sm text-muted-foreground">Verifying&hellip;</p>
      </div>
    </div>
  )
}

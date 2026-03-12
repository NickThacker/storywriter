import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: use getUser() not getSession() — getSession() trusts the client's
  // JWT without server-side verification (security anti-pattern per Supabase docs).
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Redirect unauthenticated users to /login for protected routes.
  // Public routes are defined in PUBLIC_PATHS below. Any path starting with one
  // of these prefixes is accessible without authentication.
  const PUBLIC_PATHS = [
    '/login',
    '/auth/confirm',
    '/auth/verify',
    '/auth/reset-password',
    '/api/health',
    '/api/webhooks',
    '/api/bug-report',
  ]

  // Root URL: if Supabase sent an auth code, forward to /auth/confirm.
  // Otherwise redirect to /login (no landing page on the app subdomain).
  if (request.nextUrl.pathname === '/') {
    const url = request.nextUrl.clone()
    if (request.nextUrl.searchParams.has('code')) {
      url.pathname = '/auth/confirm'
    } else if (user) {
      url.pathname = '/dashboard'
    } else {
      url.pathname = '/login'
    }
    return NextResponse.redirect(url)
  }

  const isPublic = PUBLIC_PATHS.some((p) => request.nextUrl.pathname.startsWith(p))

  if (!user && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

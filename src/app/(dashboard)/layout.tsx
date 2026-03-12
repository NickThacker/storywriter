import Link from 'next/link'
import Image from 'next/image'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { signOut } from '@/actions/auth'
import { VoiceOnboardingNudge } from '@/components/dashboard/voice-onboarding-nudge'
import { ThemeToggle } from '@/components/theme-toggle'
import { BugReportButton } from '@/components/bug-report-button'
import logo from '@/app/assets/logo.png'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Guard: unauthenticated users are redirected to login
  if (!user) {
    redirect('/login')
  }

  // Fetch settings and persona in parallel
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [{ data: settings }, { data: persona }] = await Promise.all([
    (supabase as any)
      .from('user_settings')
      .select('voice_onboarding_dismissed, is_admin')
      .eq('user_id', user.id)
      .single(),
    (supabase as any)
      .from('author_personas')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle(),
  ])

  const s = settings as { voice_onboarding_dismissed?: boolean; is_admin?: boolean } | null
  const isAdmin = Boolean(s?.is_admin)
  const showVoiceNudge = !s?.voice_onboarding_dismissed && !persona

  return (
    <div className="min-h-screen bg-background">
      {/* Top navigation bar */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-md">
        <nav className="max-w-7xl mx-auto px-6 lg:px-8 flex items-center h-14 gap-8">
          {/* Logo */}
          <Link
            href="/dashboard"
            className="shrink-0 hover:opacity-80 transition-opacity"
          >
            <Image
              src={logo}
              alt="Meridian"
              width={100}
              height={50}
              priority
              className="h-7 w-auto"
            />
          </Link>

          {/* Nav links */}
          <div className="flex items-center gap-5">
            {[
              { href: '/dashboard', label: 'Library' },
              { href: '/usage', label: 'Usage' },
              { href: '/settings', label: 'Settings' },
              ...(isAdmin ? [{ href: '/admin/prompt-logs', label: 'Admin' }] : []),
            ].map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="text-[0.68rem] uppercase tracking-[0.1em] text-muted-foreground hover:text-foreground transition-colors"
              >
                {label}
              </Link>
            ))}
          </div>

          <div className="flex-1" />

          <ThemeToggle />

          <form action={signOut}>
            <button
              type="submit"
              className="text-[0.68rem] uppercase tracking-[0.1em] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              Sign out
            </button>
          </form>
        </nav>
      </header>

      {/* Page content */}
      <main className="max-w-7xl mx-auto px-6 lg:px-8 py-10">
        {showVoiceNudge && <VoiceOnboardingNudge />}
        {children}
      </main>
      <BugReportButton userEmail={user.email ?? undefined} />
    </div>
  )
}

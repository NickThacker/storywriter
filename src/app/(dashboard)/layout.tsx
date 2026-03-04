import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { signOut } from '@/actions/auth'

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

  // Check if BYOK: if user has openrouter_api_key set they are BYOK
  // BYOK users get no billing UI at all — no /usage link
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: settings } = await (supabase as any)
    .from('user_settings')
    .select('openrouter_api_key')
    .eq('user_id', user.id)
    .single()

  const isByok = Boolean((settings as { openrouter_api_key?: string | null } | null)?.openrouter_api_key)

  return (
    <div className="min-h-screen bg-background">
      {/* Top navigation bar */}
      <header className="border-b border-border bg-card">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center h-16 gap-8">
          {/* App name — left */}
          <Link
            href="/dashboard"
            className="text-lg font-semibold text-foreground hover:text-primary transition-colors"
          >
            StoryWriter
          </Link>

          {/* Navigation links — center-left */}
          <div className="flex items-center gap-6">
            <Link
              href="/dashboard"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Dashboard
            </Link>
            {!isByok && (
              <Link
                href="/usage"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Usage
              </Link>
            )}
            <Link
              href="/settings"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Settings
            </Link>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Sign out — right */}
          <form action={signOut}>
            <button
              type="submit"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              Sign out
            </button>
          </form>
        </nav>
      </header>

      {/* Page content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}

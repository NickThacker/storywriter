import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getBillingStatus } from '@/actions/billing'
import { getProjectTokenUsage } from '@/actions/token-usage'

export const metadata: Metadata = {
  title: 'Usage — Meridian',
}

function formatDate(iso: string | null): string {
  if (!iso) return 'N/A'
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) {
    const m = n / 1_000_000
    return m % 1 === 0 ? `${m}M` : `${m.toFixed(1)}M`
  }
  if (n >= 1_000) {
    const k = n / 1_000
    return k % 1 === 0 ? `${k}K` : `${k.toFixed(1)}K`
  }
  return String(n)
}

export default async function UsagePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const billingStatus = await getBillingStatus()

  if ('error' in billingStatus) {
    return (
      <div className="mx-auto max-w-2xl space-y-10">
        <h1
          className="font-[family-name:var(--font-literata)] text-foreground"
          style={{ fontSize: 'clamp(1.6rem, 3vw, 2.25rem)', fontWeight: 400 }}
        >
          Usage
        </h1>
        <p className="text-sm text-muted-foreground">Unable to load billing information.</p>
      </div>
    )
  }

  const projectUsageResult = await getProjectTokenUsage()
  const projectUsage =
    'data' in projectUsageResult
      ? projectUsageResult.data.sort((a, b) => b.totalTokens - a.totalTokens)
      : []

  return (
    <div className="mx-auto max-w-2xl space-y-10">
      {/* Page heading */}
      <div className="border-b border-border pb-5">
        <p
          className="text-[0.65rem] uppercase tracking-[0.15em] mb-2"
          style={{ color: 'var(--gold)' }}
        >
          Account
        </p>
        <h1
          className="font-[family-name:var(--font-literata)] text-foreground"
          style={{ fontSize: 'clamp(1.6rem, 3vw, 2.25rem)', fontWeight: 400, lineHeight: 1.1 }}
        >
          Usage
        </h1>
      </div>

      {/* Plan & projects summary */}
      <section className="space-y-3">
        <p
          className="text-[0.65rem] uppercase tracking-[0.1em]"
          style={{ color: 'var(--gold)' }}
        >
          Current Plan
        </p>
        <div className="border border-border p-5 space-y-3" style={{ borderRadius: 0 }}>
          <div className="flex items-center justify-between">
            <span className="text-sm text-foreground">
              {billingStatus.tier === 'none'
                ? 'No subscription'
                : `${billingStatus.tier.charAt(0).toUpperCase() + billingStatus.tier.slice(1)} Plan`}
            </span>
            {billingStatus.billingPeriodEnd && (
              <span className="text-[0.7rem] text-muted-foreground">
                Renews {formatDate(billingStatus.billingPeriodEnd)}
              </span>
            )}
          </div>

          {/* Project slots */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Active projects</span>
            <span className="text-foreground">
              {billingStatus.activeProjects}
              {billingStatus.maxProjects !== null && ` / ${billingStatus.maxProjects}`}
              {billingStatus.maxProjects === null && ' (unlimited)'}
            </span>
          </div>

          {billingStatus.projectCredits > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Book credits</span>
              <span className="text-foreground">{billingStatus.projectCredits}</span>
            </div>
          )}

          {/* Visual bar for project usage */}
          {billingStatus.maxProjects !== null && billingStatus.maxProjects > 0 && (
            <div className="pt-2">
              <div className="h-1.5 bg-border/50 overflow-hidden">
                <div
                  className="h-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, (billingStatus.activeProjects / billingStatus.maxProjects) * 100)}%`,
                    background: 'var(--gold)',
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Per-project token breakdown (analytics) */}
      {projectUsage.length > 0 && (
        <section className="space-y-3">
          <p
            className="text-[0.65rem] uppercase tracking-[0.1em]"
            style={{ color: 'var(--gold)' }}
          >
            Token Usage by Project
          </p>
          <div className="border border-border divide-y divide-border" style={{ borderRadius: 0 }}>
            {projectUsage.map((project) => (
              <div
                key={project.projectId}
                className="flex items-center justify-between px-4 py-3 text-sm"
              >
                <span className="truncate max-w-xs text-muted-foreground">
                  {project.projectTitle}
                </span>
                <span className="font-medium shrink-0 ml-4 text-foreground">
                  {formatTokens(project.totalTokens)}
                </span>
              </div>
            ))}
          </div>
          <p className="text-[0.65rem] text-muted-foreground">
            Token usage is tracked for analytics. Generation is unlimited within your active projects.
          </p>
        </section>
      )}

      {/* Link to manage subscription */}
      <p className="text-sm text-muted-foreground">
        Manage your subscription in{' '}
        <Link
          href="/settings"
          className="text-[color:var(--gold)] hover:underline"
        >
          Settings
        </Link>
        .
      </p>
    </div>
  )
}

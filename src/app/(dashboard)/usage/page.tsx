import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getBillingStatus } from '@/actions/billing'
import { getUserTotalUsage, getProjectTokenUsage } from '@/actions/token-usage'
import { UsageBar } from '@/components/billing/usage-bar'

export const metadata: Metadata = {
  title: 'Usage — StoryWriter',
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

  // BYOK users should never see this page — redirect to dashboard
  if ('isByok' in billingStatus && billingStatus.isByok) {
    redirect('/dashboard')
  }

  // If billing status error, show a minimal error state
  if ('error' in billingStatus) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-2xl font-bold tracking-tight">Token Usage</h1>
        <p className="mt-4 text-muted-foreground">Unable to load billing information.</p>
      </div>
    )
  }

  // Fetch usage data in parallel
  const [totalUsageResult, projectUsageResult] = await Promise.all([
    getUserTotalUsage(),
    getProjectTokenUsage(),
  ])

  const totalUsage = 'data' in totalUsageResult ? totalUsageResult.data : null
  const projectUsage =
    'data' in projectUsageResult
      ? projectUsageResult.data.sort((a, b) => b.totalTokens - a.totalTokens)
      : []

  const tokensUsed = billingStatus.tokenBudgetTotal - billingStatus.tokenBudgetRemaining
  const isNearLimit = billingStatus.usagePercent >= 80 && billingStatus.usagePercent < 100

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-8">
      {/* Page heading */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Token Usage</h1>
        <p className="mt-1 text-muted-foreground">
          Your token consumption for the current billing period.
        </p>
      </div>

      {/* Near-limit warning banner */}
      {isNearLimit && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
          <strong>Heads up:</strong> You&apos;re approaching your token budget limit. Consider{' '}
          <Link href="/settings" className="underline hover:no-underline">
            upgrading or purchasing a credit pack
          </Link>
          .
        </div>
      )}

      {/* Budget progress section */}
      <section className="space-y-4">
        <div className="rounded-lg border p-5 space-y-4">
          <UsageBar
            used={tokensUsed}
            total={billingStatus.tokenBudgetTotal}
            creditPack={billingStatus.creditPackTokens}
          />
        </div>
      </section>

      {/* Current period summary */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Period Summary</h2>
        <div className="rounded-lg border divide-y">
          <div className="flex items-center justify-between px-4 py-3 text-sm">
            <span className="text-muted-foreground">Current Period</span>
            <span className="font-medium">
              {formatDate(totalUsage?.periodStart ?? null)} – {formatDate(totalUsage?.periodEnd ?? null)}
            </span>
          </div>
          <div className="flex items-center justify-between px-4 py-3 text-sm">
            <span className="text-muted-foreground">Total Tokens Used</span>
            <span className="font-medium">{formatTokens(totalUsage?.totalTokens ?? tokensUsed)}</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3 text-sm">
            <span className="text-muted-foreground">Tokens Remaining</span>
            <span className="font-medium">{formatTokens(billingStatus.tokenBudgetRemaining)}</span>
          </div>
          {billingStatus.creditPackTokens > 0 && (
            <div className="flex items-center justify-between px-4 py-3 text-sm">
              <span className="text-muted-foreground">Credit Pack Balance</span>
              <span className="font-medium">{formatTokens(billingStatus.creditPackTokens)}</span>
            </div>
          )}
        </div>
      </section>

      {/* Per-project breakdown */}
      {projectUsage.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Usage by Project</h2>
          <div className="rounded-lg border divide-y">
            {projectUsage.map((project) => (
              <div
                key={project.projectId}
                className="flex items-center justify-between px-4 py-3 text-sm"
              >
                <span className="truncate max-w-xs text-muted-foreground">
                  {project.projectTitle}
                </span>
                <span className="font-medium shrink-0 ml-4">
                  {formatTokens(project.totalTokens)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Link to manage subscription */}
      <p className="text-sm text-muted-foreground">
        Manage your subscription and credit packs in{' '}
        <Link href="/settings" className="text-primary hover:underline">
          Settings
        </Link>
        .
      </p>
    </div>
  )
}

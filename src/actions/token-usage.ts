'use server'

import { createClient } from '@/lib/supabase/server'
import type { TokenUsageRow } from '@/types/billing'

// ──────────────────────────────────────────────────────────────────────────────
// getTokenUsage — fetch all token_usage rows for a project (per-chapter view)
// ──────────────────────────────────────────────────────────────────────────────

export async function getTokenUsage(
  projectId: string
): Promise<{ data: TokenUsageRow[] } | { error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) return { error: 'You must be logged in' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('token_usage')
    .select('*')
    .eq('project_id', projectId)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[token-usage] getTokenUsage error:', error.message)
    return { error: error.message }
  }

  return { data: (data ?? []) as TokenUsageRow[] }
}

// ──────────────────────────────────────────────────────────────────────────────
// getProjectTokenUsage — aggregate token usage by project for the current user
// ──────────────────────────────────────────────────────────────────────────────

interface ProjectTokenUsage {
  projectId: string
  projectTitle: string
  totalTokens: number
}

export async function getProjectTokenUsage(): Promise<
  { data: ProjectTokenUsage[] } | { error: string }
> {
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) return { error: 'You must be logged in' }

  // Aggregate token_usage rows by project, join with projects for title
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('token_usage')
    .select('project_id, total_tokens, projects(title)')
    .eq('user_id', user.id)

  if (error) {
    console.error('[token-usage] getProjectTokenUsage error:', error.message)
    return { error: error.message }
  }

  // Aggregate in-memory: group by project_id, sum total_tokens
  const aggregated = new Map<string, { projectId: string; projectTitle: string; totalTokens: number }>()

  for (const row of (data ?? []) as Array<{
    project_id: string
    total_tokens: number
    projects: { title: string } | null
  }>) {
    const existing = aggregated.get(row.project_id)
    if (existing) {
      existing.totalTokens += row.total_tokens
    } else {
      aggregated.set(row.project_id, {
        projectId: row.project_id,
        projectTitle: row.projects?.title ?? 'Untitled Project',
        totalTokens: row.total_tokens,
      })
    }
  }

  return { data: Array.from(aggregated.values()) }
}

// ──────────────────────────────────────────────────────────────────────────────
// getUserTotalUsage — total tokens used in the current billing period
// ──────────────────────────────────────────────────────────────────────────────

interface UserTotalUsage {
  totalTokens: number
  periodStart: string | null
  periodEnd: string | null
}

export async function getUserTotalUsage(): Promise<
  { data: UserTotalUsage } | { error: string }
> {
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) return { error: 'You must be logged in' }

  // Fetch billing_period_end from user_settings
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: settings, error: settingsError } = await (supabase as any)
    .from('user_settings')
    .select('billing_period_end')
    .eq('user_id', user.id)
    .single()

  if (settingsError) {
    // No settings row — return zero usage
    return { data: { totalTokens: 0, periodStart: null, periodEnd: null } }
  }

  const billingPeriodEnd = (settings as { billing_period_end: string | null } | null)?.billing_period_end ?? null

  // Derive period start: billing_period_end minus 1 month
  let periodStart: string | null = null
  if (billingPeriodEnd) {
    const endDate = new Date(billingPeriodEnd)
    const startDate = new Date(endDate)
    startDate.setMonth(startDate.getMonth() - 1)
    periodStart = startDate.toISOString()
  }

  // Sum all token_usage rows within the billing period
  let query = (supabase as any)  // eslint-disable-line @typescript-eslint/no-explicit-any
    .from('token_usage')
    .select('total_tokens')
    .eq('user_id', user.id)

  if (periodStart) {
    query = query.gte('created_at', periodStart)
  }

  if (billingPeriodEnd) {
    query = query.lte('created_at', billingPeriodEnd)
  }

  const { data: usageRows, error: usageError } = await query

  if (usageError) {
    console.error('[token-usage] getUserTotalUsage error:', usageError.message)
    return { error: usageError.message }
  }

  const totalTokens = ((usageRows ?? []) as Array<{ total_tokens: number }>).reduce(
    (sum, row) => sum + (row.total_tokens ?? 0),
    0
  )

  return {
    data: {
      totalTokens,
      periodStart,
      periodEnd: billingPeriodEnd,
    },
  }
}

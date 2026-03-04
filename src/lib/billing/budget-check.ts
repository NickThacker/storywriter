// Pre-generation budget check and post-generation token accounting utilities.
// Uses service-role client for inserts (bypasses RLS), user-scoped client for reads.

import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import type { BudgetCheckResult } from '@/types/billing'

// ──────────────────────────────────────────────────────────────────────────────
// Service-role admin client (bypasses RLS for token_usage inserts)
// ──────────────────────────────────────────────────────────────────────────────

function createAdminClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// checkTokenBudget — called before every generation request
// ──────────────────────────────────────────────────────────────────────────────

interface UserSettingsRow {
  openrouter_api_key: string | null
  subscription_tier: string | null
  token_budget_remaining: number | null
  token_budget_total: number | null
  credit_pack_tokens: number | null
}

export async function checkTokenBudget(userId: string): Promise<BudgetCheckResult> {
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: settings, error } = await (supabase as any)
    .from('user_settings')
    .select('openrouter_api_key, subscription_tier, token_budget_remaining, token_budget_total, credit_pack_tokens')
    .eq('user_id', userId)
    .single()

  if (error || !settings) {
    // If we can't read settings, default to BYOK-bypass to avoid blocking generation
    // (settings row might not exist for legacy users)
    console.error('[budget-check] Failed to read user_settings:', error?.message)
    return { allowed: true, isByok: true }
  }

  const row = settings as UserSettingsRow

  // BYOK users bypass billing entirely
  if (row.openrouter_api_key) {
    return { allowed: true, isByok: true }
  }

  // No subscription and no API key
  if (!row.subscription_tier || row.subscription_tier === 'none') {
    return { allowed: false, isByok: false, reason: 'no_subscription' }
  }

  const budgetRemaining = row.token_budget_remaining ?? 0
  const budgetTotal = row.token_budget_total ?? 0
  const creditPackTokens = row.credit_pack_tokens ?? 0

  // Effective remaining = subscription budget + credit pack tokens
  const effectiveRemaining = budgetRemaining + creditPackTokens

  if (effectiveRemaining <= 0) {
    return { allowed: false, isByok: false, reason: 'budget_exhausted' }
  }

  // Calculate usage percentage against subscription budget (ignore credit packs in %)
  const usagePercent =
    budgetTotal > 0 ? (budgetTotal - budgetRemaining) / budgetTotal : 0

  if (usagePercent >= 0.8) {
    return {
      allowed: true,
      isByok: false,
      warningThreshold: 'near_limit',
      budgetRemaining,
      budgetTotal,
    }
  }

  return { allowed: true, isByok: false, warningThreshold: null }
}

// ──────────────────────────────────────────────────────────────────────────────
// deductTokens — called after generation (fire-and-forget from interceptor)
// ──────────────────────────────────────────────────────────────────────────────

export async function deductTokens(userId: string, totalTokens: number): Promise<void> {
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: settings, error } = await (supabase as any)
    .from('user_settings')
    .select('token_budget_remaining, credit_pack_tokens')
    .eq('user_id', userId)
    .single()

  if (error || !settings) {
    console.error('[budget-check] deductTokens: failed to read user_settings:', error?.message)
    return
  }

  const row = settings as { token_budget_remaining: number | null; credit_pack_tokens: number | null }
  const budgetRemaining = row.token_budget_remaining ?? 0
  const creditPackTokens = row.credit_pack_tokens ?? 0

  // Deduct from subscription budget first, then overflow from credit pack
  let newBudgetRemaining: number
  let newCreditPackTokens: number

  if (budgetRemaining >= totalTokens) {
    newBudgetRemaining = Math.max(0, budgetRemaining - totalTokens)
    newCreditPackTokens = creditPackTokens
  } else {
    // Subscription budget is exhausted; deduct remainder from credit pack
    const overflow = totalTokens - budgetRemaining
    newBudgetRemaining = 0
    newCreditPackTokens = Math.max(0, creditPackTokens - overflow)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateError } = await (supabase as any)
    .from('user_settings')
    .update({
      token_budget_remaining: newBudgetRemaining,
      credit_pack_tokens: newCreditPackTokens,
    })
    .eq('user_id', userId)

  if (updateError) {
    console.error('[budget-check] deductTokens: failed to update user_settings:', updateError.message)
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// recordTokenUsage — insert row to token_usage table (uses service role)
// ──────────────────────────────────────────────────────────────────────────────

interface RecordTokenUsageParams {
  userId: string
  projectId: string
  chapterNumber: number
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

export async function recordTokenUsage(params: RecordTokenUsageParams): Promise<void> {
  const adminSupabase = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (adminSupabase as any)
    .from('token_usage')
    .insert({
      user_id: params.userId,
      project_id: params.projectId,
      chapter_number: params.chapterNumber,
      prompt_tokens: params.promptTokens,
      completion_tokens: params.completionTokens,
      total_tokens: params.totalTokens,
    })

  if (error) {
    console.error('[budget-check] recordTokenUsage: failed to insert:', error.message)
    // Do not throw — this is called fire-and-forget
  }
}

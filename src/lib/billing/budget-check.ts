// Project access check — replaces the old token budget check.
// Checks whether a user can create a new project based on their tier + project credits.
// Generation within an existing project is always allowed (unlimited within project).

import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import type { AccessCheckResult } from '@/types/billing'
import type { SubscriptionTier } from '@/types/database'

const PROJECT_LIMITS: Record<SubscriptionTier, number | null> = {
  none: 0,
  author: 3,
  studio: null, // unlimited
}

// ──────────────────────────────────────────────────────────────────────────────
// Admin client (service-role) for cross-user queries
// ──────────────────────────────────────────────────────────────────────────────

function createAdminClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// checkProjectAccess — can the user create another project?
// ──────────────────────────────────────────────────────────────────────────────

export async function checkProjectAccess(userId: string): Promise<AccessCheckResult> {
  const supabase = await createClient()

  // Fetch user settings + count active projects in parallel
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [settingsResult, projectsResult] = await Promise.all([
    (supabase as any)
      .from('user_settings')
      .select('subscription_tier, project_credits')
      .eq('user_id', userId)
      .single(),
    (supabase as any)
      .from('projects')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),
  ])

  const settings = settingsResult.data as {
    subscription_tier: SubscriptionTier
    project_credits: number
  } | null

  const tier: SubscriptionTier = settings?.subscription_tier ?? 'none'
  const projectCredits = settings?.project_credits ?? 0
  const activeProjects = projectsResult.count ?? 0
  const maxProjects = PROJECT_LIMITS[tier]

  // Studio: unlimited
  if (maxProjects === null) {
    return { allowed: true, tier, projectCredits, activeProjects, maxProjects }
  }

  // Author: check active project count against limit
  if (tier !== 'none' && activeProjects < maxProjects) {
    return { allowed: true, tier, projectCredits, activeProjects, maxProjects }
  }

  // Has project credits (from one-time purchases)?
  if (projectCredits > 0) {
    return { allowed: true, tier, projectCredits, activeProjects, maxProjects }
  }

  // No access
  const reason = tier === 'none' ? 'no_subscription' : 'project_limit_reached'
  return { allowed: false, reason, tier, projectCredits, activeProjects, maxProjects }
}

// ──────────────────────────────────────────────────────────────────────────────
// consumeProjectCredit — deduct one project credit after creating a credit-based project
// ──────────────────────────────────────────────────────────────────────────────

export async function consumeProjectCredit(userId: string): Promise<void> {
  const supabase = createAdminClient()

  // Fetch current credits
  const { data: settings } = await supabase
    .from('user_settings')
    .select('project_credits')
    .eq('user_id', userId)
    .single()

  const current = (settings as { project_credits: number } | null)?.project_credits ?? 0
  if (current <= 0) return

  await supabase
    .from('user_settings')
    .update({ project_credits: current - 1 })
    .eq('user_id', userId)
}

// ──────────────────────────────────────────────────────────────────────────────
// checkGenerationAccess — can the user generate within an existing project?
// For subscriptions: subscription must be active.
// For credit projects: credit must not be expired.
// ──────────────────────────────────────────────────────────────────────────────

export async function checkGenerationAccess(
  userId: string,
  projectId: string
): Promise<{ allowed: boolean; reason?: string }> {
  const supabase = await createClient()

  // Fetch project billing info + user tier in parallel
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [projectResult, settingsResult] = await Promise.all([
    (supabase as any)
      .from('projects')
      .select('billing_type, credit_expires_at')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single(),
    (supabase as any)
      .from('user_settings')
      .select('subscription_tier')
      .eq('user_id', userId)
      .single(),
  ])

  if (!projectResult.data) {
    return { allowed: false, reason: 'project_not_found' }
  }

  const project = projectResult.data as { billing_type: string; credit_expires_at: string | null }
  const tier = (settingsResult.data as { subscription_tier: string } | null)?.subscription_tier ?? 'none'

  if (project.billing_type === 'credit') {
    // Credit-based project: check expiry
    if (project.credit_expires_at && new Date(project.credit_expires_at) < new Date()) {
      return { allowed: false, reason: 'project_expired' }
    }
    return { allowed: true }
  }

  // Subscription-based project: tier must be active
  if (tier === 'none') {
    return { allowed: false, reason: 'no_subscription' }
  }

  return { allowed: true }
}

// ──────────────────────────────────────────────────────────────────────────────
// recordTokenUsage — kept for analytics (fire-and-forget)
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
    console.error('[billing] recordTokenUsage: failed to insert:', error.message)
  }
}

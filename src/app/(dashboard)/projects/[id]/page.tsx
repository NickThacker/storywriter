import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Project — StoryWriter',
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  // Authenticate
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Fetch project (verify ownership via user_id)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: project } = await (supabase as any)
    .from('projects')
    .select('id, status, intake_data')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!project) redirect('/dashboard')

  const { status, intake_data } = project as {
    status: string
    intake_data: Record<string, unknown> | null
  }

  // Check if an outline exists for this project
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: outline } = await (supabase as any)
    .from('outlines')
    .select('id')
    .eq('project_id', id)
    .maybeSingle()

  const hasOutline = !!outline

  // Routing logic — this page never renders content, it's a pure router
  if (status === 'draft') {
    if (hasOutline) {
      // Draft project with outline → go to outline review
      redirect(`/projects/${id}/outline`)
    } else {
      // Draft project with or without intake_data → go to intake wizard
      // (layout handles resume from saved intake_data)
      redirect(`/projects/${id}/intake`)
    }
  }

  // Status 'writing' (outline approved) → go to outline view for now
  // Phase 3 will add chapter view routing
  if (status === 'writing') {
    redirect(`/projects/${id}/outline`)
  }

  // Fallback for any other status (e.g. 'complete') — go to outline
  redirect(`/projects/${id}/outline`)
}

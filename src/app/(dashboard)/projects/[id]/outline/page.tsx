import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getOutline } from '@/actions/outline'
import { OutlinePanel } from '@/components/outline/outline-panel'
import type { OutlineRow, ProjectRow } from '@/types/database'
import type { IntakeData } from '@/lib/validations/intake'

export const metadata = {
  title: 'Outline — StoryWriter',
}

export default async function OutlinePage({
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
  const { data: project, error: projectError } = await (supabase as any)
    .from('projects')
    .select('id, title, status, intake_data, genre')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (projectError || !project) redirect('/dashboard')

  const typedProject = project as Pick<ProjectRow, 'id' | 'title' | 'status' | 'intake_data' | 'genre'>
  const intakeData = typedProject.intake_data as IntakeData | null

  // Fetch outline data
  const outlineResult = await getOutline(id)
  const outline = 'error' in outlineResult ? null : outlineResult.data

  // If no outline and no intake data, redirect to intake wizard
  if (!outline && !intakeData) {
    redirect(`/projects/${id}/intake`)
  }

  return (
    <OutlinePanel
      projectId={id}
      projectTitle={typedProject.title}
      initialOutline={outline as OutlineRow | null}
      intakeData={intakeData}
    />
  )
}

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { IntakeStoreProvider } from '@/components/intake/intake-store-provider'
import type { IntakeState } from '@/lib/stores/intake-store'
import { GENRES } from '@/lib/data/genres'

export const metadata = {
  title: 'Story Intake — StoryWriter',
}

export default async function IntakeLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const [{ data: project }, { data: outline }] = await Promise.all([
    (supabase as any)
      .from('projects')
      .select('id, title, genre, intake_data')
      .eq('id', id)
      .single(),
    (supabase as any)
      .from('outlines')
      .select('id')
      .eq('project_id', id)
      .maybeSingle(),
  ])

  if (!project) {
    redirect('/dashboard')
  }

  const locked = !!outline

  // Hydrate from existing intake_data if project was previously started
  let initialState: Partial<IntakeState> | undefined = project.intake_data
    ? (project.intake_data as Partial<IntakeState>)
    : undefined

  // If no intake_data but project has a genre from creation, pre-fill it
  if (!initialState && project.genre) {
    const match = GENRES.find(
      (g) => g.label.toLowerCase() === (project.genre as string).toLowerCase()
    )
    if (match) {
      initialState = { genre: match.id }
    }
  }

  // Always land on the review step when resuming saved data or when locked
  if ((project.intake_data && initialState?.genre) || locked) {
    initialState = { ...initialState, currentStep: 6 }
  }

  return (
    <IntakeStoreProvider initialState={initialState} locked={locked}>
      {children}
    </IntakeStoreProvider>
  )
}

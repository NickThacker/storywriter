import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { IntakeStoreProvider } from '@/components/intake/intake-store-provider'
import type { IntakeState } from '@/lib/stores/intake-store'

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

  const { data: project } = await (supabase as any)
    .from('projects')
    .select('id, title, intake_data')
    .eq('id', id)
    .single()

  if (!project) {
    redirect('/dashboard')
  }

  // Hydrate from existing intake_data if project was previously started
  const initialState: Partial<IntakeState> | undefined = project.intake_data
    ? (project.intake_data as Partial<IntakeState>)
    : undefined

  return (
    <IntakeStoreProvider initialState={initialState}>
      {children}
    </IntakeStoreProvider>
  )
}

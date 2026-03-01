import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { BibleTabs } from '@/components/story-bible/bible-tabs'
import type { CharacterRow, LocationRow, WorldFactRow } from '@/types/database'

export const metadata: Metadata = {
  title: 'Story Bible — StoryWriter',
}

export default async function StoryBiblePage({
  params,
}: {
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

  // Verify project ownership
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: project } = await (supabase as any)
    .from('projects')
    .select('id, title')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!project) {
    redirect('/dashboard')
  }

  // Fetch all story bible data for the project
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: characters } = await (supabase as any)
    .from('characters')
    .select('*')
    .eq('project_id', id)
    .order('role')
    .order('name')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: locations } = await (supabase as any)
    .from('locations')
    .select('*')
    .eq('project_id', id)
    .order('name')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: worldFacts } = await (supabase as any)
    .from('world_facts')
    .select('*')
    .eq('project_id', id)
    .order('category')
    .order('created_at')

  return (
    <div className="container max-w-5xl py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Story Bible</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your reference library for {(project as { title: string }).title}
        </p>
      </div>
      <BibleTabs
        projectId={id}
        characters={(characters ?? []) as CharacterRow[]}
        locations={(locations ?? []) as LocationRow[]}
        worldFacts={(worldFacts ?? []) as WorldFactRow[]}
      />
    </div>
  )
}

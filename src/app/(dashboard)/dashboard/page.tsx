import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { ProjectGrid } from '@/components/dashboard/project-grid'
import { EmptyState } from '@/components/dashboard/empty-state'
import type { Project } from '@/types/database'

export const metadata: Metadata = {
  title: 'Dashboard — Meridian',
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: projects } = await (supabase as any)
    .from('projects')
    .select('id, title, status, genre, word_count, chapter_count, chapters_done, updated_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })

  const typedProjects = (projects ?? []) as Pick<
    Project,
    'id' | 'title' | 'status' | 'genre' | 'word_count' | 'chapter_count' | 'chapters_done' | 'updated_at'
  >[]

  return (
    <div className="space-y-4">
      {typedProjects.length === 0 ? (
        <EmptyState />
      ) : (
        <ProjectGrid projects={typedProjects as Project[]} />
      )}
    </div>
  )
}

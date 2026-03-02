import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getChapterCheckpoints } from '@/actions/chapters'
import { ChapterPanel } from '@/components/chapters/chapter-panel'
import type { OutlineChapter, ProjectRow, OutlineRow } from '@/types/database'
import type { ChapterCheckpointRow } from '@/types/project-memory'

export const metadata = { title: 'Chapters — StoryWriter' }

export default async function ChaptersPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  // 1. Authenticate
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // 2. Fetch project (verify ownership via user_id)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: project, error: projectError } = await (supabase as any)
    .from('projects')
    .select('id, title, status, word_count, chapter_count, chapters_done')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  // 3. If no project → redirect('/dashboard')
  if (projectError || !project) redirect('/dashboard')

  const typedProject = project as Pick<
    ProjectRow,
    'id' | 'title' | 'status' | 'word_count' | 'chapter_count' | 'chapters_done'
  >

  // 4. Fetch outline (chapters, chapter_count, target_length, status)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: outline, error: outlineError } = await (supabase as any)
    .from('outlines')
    .select('id, chapters, chapter_count, target_length, status')
    .eq('project_id', id)
    .maybeSingle()

  // 5. If outline not approved → redirect to outline page
  if (outlineError || !outline || outline.status !== 'approved') {
    redirect(`/projects/${id}/outline`)
  }

  const typedOutline = outline as Pick<
    OutlineRow,
    'id' | 'chapters' | 'chapter_count' | 'target_length' | 'status'
  >

  // 6. Fetch all chapter checkpoints
  const checkpointsResult = await getChapterCheckpoints(id)
  const checkpoints: ChapterCheckpointRow[] =
    'error' in checkpointsResult ? [] : checkpointsResult.data

  // 7. Check project_memory exists
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: projectMemory } = await (supabase as any)
    .from('project_memory')
    .select('id')
    .eq('project_id', id)
    .maybeSingle()

  if (!projectMemory) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="max-w-md text-center">
          <h2 className="text-lg font-semibold text-foreground mb-2">
            Project memory not initialized
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Return to intake to repair the project memory before generating chapters.
          </p>
          <a
            href={`/projects/${id}/intake`}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2"
          >
            Go to Intake
          </a>
        </div>
      </div>
    )
  }

  // 8. Render ChapterPanel with all data
  return (
    <ChapterPanel
      projectId={typedProject.id}
      projectTitle={typedProject.title}
      outlineChapters={typedOutline.chapters as OutlineChapter[]}
      checkpoints={checkpoints}
      chapterCount={typedOutline.chapter_count}
      targetLength={typedOutline.target_length}
      projectWordCount={typedProject.word_count}
      chaptersDone={typedProject.chapters_done}
    />
  )
}

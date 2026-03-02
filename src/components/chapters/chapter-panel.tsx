'use client'

// Placeholder — full implementation in Plan 04 (ChapterPanelOrchestrator)
// This stub allows chapters/page.tsx to compile while the orchestrator is being built.

import type { OutlineChapter } from '@/types/database'
import type { ChapterCheckpointRow } from '@/types/project-memory'

interface ChapterPanelProps {
  projectId: string
  projectTitle: string
  outlineChapters: OutlineChapter[]
  checkpoints: ChapterCheckpointRow[]
  chapterCount: number
  targetLength: string
  projectWordCount: number
  chaptersDone: number
}

export function ChapterPanel({
  projectTitle,
  chapterCount,
  chaptersDone,
}: ChapterPanelProps) {
  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="text-center text-muted-foreground">
        <p className="font-medium">{projectTitle}</p>
        <p className="text-sm mt-1">
          {chaptersDone} / {chapterCount} chapters complete
        </p>
        <p className="text-xs mt-2 text-muted-foreground/60">
          Chapter panel loading...
        </p>
      </div>
    </div>
  )
}

'use client'

import { useState, useCallback } from 'react'
import { CheckpointStepApprove } from './checkpoint-step-approve'
import type { OutlineChapter } from '@/types/database'
import type { ChapterCheckpointRow } from '@/types/project-memory'

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

interface CheckpointPanelProps {
  projectId: string
  chapter: OutlineChapter
  checkpoint: ChapterCheckpointRow
  outlineChapters: OutlineChapter[]
  isLastChapter: boolean
  onApprove: (chapterNumber: number) => void
  onRewrite: (chapterNumber: number) => void
  onDirectionSaved: (chapterNumber: number, directionForNext: string) => void
}

// ──────────────────────────────────────────────────────────────────────────────
// CheckpointPanel — two-step checkpoint shell with slide-in animation
// ──────────────────────────────────────────────────────────────────────────────

export function CheckpointPanel({
  chapter,
  checkpoint,
  isLastChapter,
  onApprove,
  onRewrite,
}: CheckpointPanelProps) {
  // Step state: 'approve' (step 1) or 'direction' (step 2)
  const [step, setStep] = useState<'approve' | 'direction'>('approve')

  const handleApproveAndContinue = useCallback(() => {
    onApprove(chapter.number)
    if (isLastChapter) {
      // Last chapter — stay on approve step, NovelCompleteSummary will show (Plan 04)
      return
    }
    // Move to direction step
    setStep('direction')
  }, [chapter.number, isLastChapter, onApprove])

  const handleRewrite = useCallback(() => {
    onRewrite(chapter.number)
  }, [chapter.number, onRewrite])

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* Header */}
      <div className="border-b border-border px-5 py-3">
        <h3 className="text-sm font-semibold">Checkpoint</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Chapter {chapter.number}: {chapter.title}
        </p>
        {/* Step indicator */}
        <div className="mt-2 flex items-center gap-2">
          <div
            className={`h-1.5 flex-1 rounded-full ${step === 'approve' ? 'bg-primary' : 'bg-primary/30'}`}
          />
          {!isLastChapter && (
            <div
              className={`h-1.5 flex-1 rounded-full ${step === 'direction' ? 'bg-primary' : 'bg-muted'}`}
            />
          )}
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-y-auto">
        {step === 'approve' ? (
          <CheckpointStepApprove
            chapter={chapter}
            checkpoint={checkpoint}
            onApprove={handleApproveAndContinue}
            onRewrite={handleRewrite}
            isLastChapter={isLastChapter}
          />
        ) : (
          // Step 2: Direction selection — placeholder for Plan 03
          // CheckpointStepDirection will be imported here in Plan 03
          <div className="p-5 text-sm text-muted-foreground">
            Direction selection loading...
          </div>
        )}
      </div>
    </div>
  )
}

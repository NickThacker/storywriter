'use client'

import { useState, useCallback } from 'react'
import { CheckpointStepApprove } from './checkpoint-step-approve'
import { CheckpointStepDirection } from './checkpoint-step-direction'
import { NovelCompleteSummary } from './novel-complete-summary'
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
  // Novel completion props (used when isLastChapter is true and chapter is approved)
  projectTitle: string
  totalWordCount: number
  totalChapters: number
  plotThreadStats: { resolved: number; open: number }
  isAnalyzing?: boolean
  isAuditing?: boolean
}

// ──────────────────────────────────────────────────────────────────────────────
// CheckpointPanel — two-step checkpoint shell with slide-in animation
// ──────────────────────────────────────────────────────────────────────────────

export function CheckpointPanel({
  projectId,
  chapter,
  checkpoint,
  outlineChapters,
  isLastChapter,
  onApprove,
  onRewrite,
  onDirectionSaved,
  projectTitle,
  totalWordCount,
  totalChapters,
  plotThreadStats,
  isAnalyzing,
  isAuditing,
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

  const handleBackToApprove = useCallback(() => {
    setStep('approve')
  }, [])

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
        {/* Last chapter approved — show novel completion summary instead of direction step */}
        {isLastChapter && (checkpoint.approval_status ?? 'draft') === 'approved' ? (
          <NovelCompleteSummary
            projectTitle={projectTitle}
            totalChapters={totalChapters}
            totalWordCount={totalWordCount}
            resolvedThreads={plotThreadStats.resolved}
            openThreads={plotThreadStats.open}
          />
        ) : step === 'approve' ? (
          <CheckpointStepApprove
            chapter={chapter}
            checkpoint={checkpoint}
            onApprove={handleApproveAndContinue}
            onRewrite={handleRewrite}
            isLastChapter={isLastChapter}
            isAnalyzing={isAnalyzing}
            isAuditing={isAuditing}
          />
        ) : (
          // Step 2: Direction selection
          step === 'direction' && !isLastChapter ? (
            <CheckpointStepDirection
              projectId={projectId}
              chapterNumber={chapter.number}
              checkpoint={checkpoint}
              nextChapterTitle={
                outlineChapters.find((c) => c.number === chapter.number + 1)?.title ??
                `Chapter ${chapter.number + 1}`
              }
              onDirectionSaved={onDirectionSaved}
              onBack={handleBackToApprove}
            />
          ) : null
        )}
      </div>
    </div>
  )
}

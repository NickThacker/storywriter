'use client'

import { Button } from '@/components/ui/button'
import { CheckCircle, RotateCcw } from 'lucide-react'
import type { OutlineChapter } from '@/types/database'
import type { ChapterCheckpointRow, StateDiff } from '@/types/project-memory'

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

interface CheckpointStepApproveProps {
  chapter: OutlineChapter
  checkpoint: ChapterCheckpointRow
  onApprove: () => void
  onRewrite: () => void
  isLastChapter: boolean
}

// ──────────────────────────────────────────────────────────────────────────────
// CheckpointStepApprove — Step 1: chapter stats + approve/rewrite buttons
// ──────────────────────────────────────────────────────────────────────────────

export function CheckpointStepApprove({
  checkpoint,
  onApprove,
  onRewrite,
  isLastChapter,
}: CheckpointStepApproveProps) {
  // Extract stats from checkpoint data
  const wordCount = checkpoint.chapter_text
    ? checkpoint.chapter_text.trim().split(/\s+/).filter(Boolean).length
    : 0

  const stateDiff: StateDiff | null =
    checkpoint.state_diff && typeof checkpoint.state_diff === 'object'
      ? (checkpoint.state_diff as StateDiff)
      : null

  const threadsAdvanced = stateDiff?.advancedThreads?.length ?? 0
  const threadsResolved = stateDiff?.resolvedThreads?.length ?? 0
  const threadsNew = stateDiff?.newThreads?.length ?? 0
  const characterChanges = stateDiff ? Object.keys(stateDiff.characterChanges ?? {}).length : 0
  const newForeshadowing = stateDiff?.newForeshadowing?.length ?? 0
  const newContinuity = stateDiff?.newContinuityFacts?.length ?? 0
  const continuityNotes = checkpoint.continuity_notes?.length ?? 0

  return (
    <div className="p-5 space-y-5">
      {/* Summary */}
      {checkpoint.summary && (
        <div>
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
            Summary
          </h4>
          <p className="text-sm text-foreground/90 leading-relaxed">{checkpoint.summary}</p>
        </div>
      )}

      {/* Stats grid */}
      <div>
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
          Chapter Stats
        </h4>
        <div className="grid grid-cols-2 gap-2.5">
          <StatCard label="Words" value={wordCount.toLocaleString()} />
          <StatCard label="Characters Featured" value={String(characterChanges)} />
          <StatCard label="Threads Advanced" value={String(threadsAdvanced)} />
          <StatCard label="Threads Resolved" value={String(threadsResolved)} />
          <StatCard label="New Threads" value={String(threadsNew)} />
          <StatCard label="Foreshadowing Planted" value={String(newForeshadowing)} />
          <StatCard label="New Continuity Facts" value={String(newContinuity)} />
          <StatCard label="Continuity Notes" value={String(continuityNotes)} />
        </div>
      </div>

      {/* Continuity notes detail */}
      {checkpoint.continuity_notes && checkpoint.continuity_notes.length > 0 && (
        <div className="mt-3 rounded-lg border border-border bg-muted/20 p-4">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
            Continuity Notes
          </h4>
          <ul className="space-y-2.5">
            {checkpoint.continuity_notes.map((note, i) => (
              <li
                key={i}
                className="text-xs text-foreground/80 leading-relaxed pl-4 border-l-2 border-muted-foreground/30"
              >
                {note}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions */}
      <div className="pt-2 space-y-2">
        <Button onClick={onApprove} className="w-full gap-2">
          <CheckCircle className="h-4 w-4" />
          {isLastChapter ? 'Approve Final Chapter' : 'Approve & Continue'}
        </Button>
        <Button variant="outline" onClick={onRewrite} className="w-full gap-2">
          <RotateCcw className="h-4 w-4" />
          Request Rewrite
        </Button>
      </div>

      {/* Soft approval note */}
      <p className="text-xs text-muted-foreground text-center pt-1">
        Approval confirms direction. You can still edit the prose anytime.
      </p>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// StatCard — small stat display sub-component
// ──────────────────────────────────────────────────────────────────────────────

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted/50 px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold tabular-nums">{value}</p>
    </div>
  )
}

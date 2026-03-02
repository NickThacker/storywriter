'use client'

import { Sparkles, BookOpen, FileText, CheckCircle, AlertCircle } from 'lucide-react'

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

interface NovelCompleteSummaryProps {
  projectTitle: string
  totalChapters: number
  totalWordCount: number
  resolvedThreads: number
  openThreads: number
}

// ──────────────────────────────────────────────────────────────────────────────
// StatCard — small stat display card
// ──────────────────────────────────────────────────────────────────────────────

interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
}

function StatCard({ icon: Icon, label, value }: StatCardProps) {
  return (
    <div className="flex flex-col items-center rounded-lg border border-border bg-muted/40 px-3 py-3 text-center">
      <Icon className="mb-1.5 h-4 w-4 text-muted-foreground" />
      <span className="text-base font-semibold tabular-nums">{value}</span>
      <span className="mt-0.5 text-xs text-muted-foreground">{label}</span>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// NovelCompleteSummary — celebration component for final chapter approval
// ──────────────────────────────────────────────────────────────────────────────

export function NovelCompleteSummary({
  projectTitle,
  totalChapters,
  totalWordCount,
  resolvedThreads,
  openThreads,
}: NovelCompleteSummaryProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center p-8 text-center">
      {/* Icon */}
      <div className="rounded-full bg-primary/10 p-4 mb-4">
        <Sparkles className="h-8 w-8 text-primary" />
      </div>

      {/* Title */}
      <h3 className="text-lg font-semibold">Novel Complete</h3>
      <p className="mt-1 text-sm text-muted-foreground">{projectTitle}</p>

      {/* Stats grid */}
      <div className="mt-6 grid grid-cols-2 gap-3 w-full max-w-xs">
        <StatCard icon={BookOpen} label="Chapters" value={String(totalChapters)} />
        <StatCard icon={FileText} label="Words" value={totalWordCount.toLocaleString()} />
        <StatCard icon={CheckCircle} label="Threads Resolved" value={String(resolvedThreads)} />
        <StatCard icon={AlertCircle} label="Threads Open" value={String(openThreads)} />
      </div>

      {/* Congratulatory message */}
      <p className="mt-6 text-sm text-muted-foreground max-w-xs">
        Your novel is complete. You can still edit any chapter. Head to Export when you're ready to share it.
      </p>
    </div>
  )
}

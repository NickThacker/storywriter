'use client'

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

interface ProgressBarProps {
  chaptersDone: number
  totalChapters: number
  wordCount: number
  targetLength: string
}

// ──────────────────────────────────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────────────────────────────────

const TARGET_WORDS: Record<string, number> = {
  short: 50000,
  standard: 80000,
  epic: 120000,
}

const MILESTONES = [25, 50, 75, 100]

// ──────────────────────────────────────────────────────────────────────────────
// ProgressBar
// ──────────────────────────────────────────────────────────────────────────────

export function ProgressBar({
  chaptersDone,
  totalChapters,
  wordCount,
  targetLength,
}: ProgressBarProps) {
  const targetWords = TARGET_WORDS[targetLength] ?? TARGET_WORDS.standard
  const fillPercent =
    totalChapters > 0
      ? Math.min(100, Math.round((chaptersDone / totalChapters) * 100))
      : 0

  return (
    <div className="border-b border-border bg-muted/20 px-5 pt-3" style={{ paddingBottom: '10px' }}>
      <div className="flex items-start gap-3">
        {/* Left: chapter count — aligned to the bar */}
        <span className="shrink-0 text-xs text-muted-foreground tabular-nums mt-[-2px]">
          {chaptersDone}/{totalChapters} chapters
        </span>

        {/* Center: progress bar + diamonds + labels all in one relative container */}
        <div className="relative flex-1">
          {/* Track */}
          <div className="h-2 w-full rounded-full bg-muted">
            <div
              className="h-2 rounded-full bg-primary transition-all duration-500"
              style={{ width: `${fillPercent}%` }}
            />
          </div>

          {/* Milestone diamond markers */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-2 flex items-center">
            {MILESTONES.map((milestone) => {
              const reached = fillPercent >= milestone
              return (
                <div
                  key={milestone}
                  className="absolute -translate-x-1/2"
                  style={{ left: `${milestone}%` }}
                >
                  <div
                    className={`h-2.5 w-2.5 rotate-45 border ${
                      reached
                        ? 'border-primary bg-primary'
                        : 'border-muted-foreground/30 bg-background'
                    }`}
                  />
                </div>
              )
            })}
          </div>

          {/* Milestone % labels — same container, so left % aligns with diamonds */}
          <div className="relative mt-1.5">
            {MILESTONES.map((milestone) => {
              const reached = fillPercent >= milestone
              return (
                <span
                  key={milestone}
                  className={`absolute -translate-x-1/2 text-[10px] tabular-nums ${
                    reached ? 'text-primary/70' : 'text-muted-foreground/40'
                  }`}
                  style={{ left: `${milestone}%` }}
                >
                  {milestone}%
                </span>
              )
            })}
            {/* Spacer for container height */}
            <span className="invisible text-[10px]">&nbsp;</span>
          </div>
        </div>

        {/* Right: word count — aligned to the bar */}
        <span className="shrink-0 text-xs text-muted-foreground tabular-nums mt-[-2px]">
          {wordCount.toLocaleString()} / {targetWords.toLocaleString()} words
        </span>
      </div>
    </div>
  )
}

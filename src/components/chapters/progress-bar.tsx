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
    <div className="border-b bg-muted/20 px-4 py-2.5">
      <div className="flex items-center gap-3">
        {/* Left: chapter count */}
        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
          {chaptersDone}/{totalChapters} chapters
        </span>

        {/* Center: progress bar */}
        <div className="relative flex-1">
          {/* Track */}
          <div className="h-2 w-full rounded-full bg-muted">
            {/* Fill */}
            <div
              className="h-2 rounded-full bg-primary transition-all duration-500"
              style={{ width: `${fillPercent}%` }}
            />
          </div>

          {/* Milestone markers */}
          <div className="pointer-events-none absolute inset-0 flex items-center">
            {MILESTONES.map((milestone) => {
              const reached = fillPercent >= milestone
              return (
                <div
                  key={milestone}
                  className="absolute -translate-x-1/2 flex flex-col items-center"
                  style={{ left: `${milestone}%` }}
                >
                  {/* Diamond marker */}
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
        </div>

        {/* Right: word count */}
        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
          {wordCount.toLocaleString()} / {targetWords.toLocaleString()} words
        </span>
      </div>

      {/* Milestone labels */}
      <div className="relative mt-2 ml-[60px] mr-[120px]">
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
      </div>
    </div>
  )
}

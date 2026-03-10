'use client'

import { useEffect, useRef } from 'react'
import { Clock, Loader2, BookOpen, CheckCircle, Sparkles, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

export interface ChapterListItem {
  number: number
  title: string
  status: 'pending' | 'generating' | 'checkpoint' | 'approved'
  wordCount: number
  hasText: boolean
  isAffected: boolean
  hasConflict: boolean
}

interface ChapterListProps {
  chapters: ChapterListItem[]
  selectedIndex: number
  onSelect: (index: number) => void
  onGenerate: (chapterNumber: number) => void
  generatingChapter: number | null
  collapsed?: boolean
}

// ──────────────────────────────────────────────────────────────────────────────
// Status badge config
// ──────────────────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  pending: {
    label: 'Pending',
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
    dotColor: 'bg-gray-400',
    icon: Clock,
  },
  generating: {
    label: 'Generating',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    dotColor: 'bg-blue-500',
    icon: Loader2,
  },
  checkpoint: {
    label: 'Draft',
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    dotColor: 'bg-amber-500',
    icon: BookOpen,
  },
  approved: {
    label: 'Approved',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    dotColor: 'bg-green-500',
    icon: CheckCircle,
  },
} as const

// ──────────────────────────────────────────────────────────────────────────────
// StatusBadge
// ──────────────────────────────────────────────────────────────────────────────

function StatusBadge({
  status,
}: {
  status: ChapterListItem['status']
}) {
  const config = STATUS_CONFIG[status]
  const Icon = config.icon

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
        config.bgColor,
        config.color
      )}
    >
      <Icon
        className={cn('h-3 w-3', status === 'generating' && 'animate-spin')}
      />
      {config.label}
    </span>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// ChapterList
// ──────────────────────────────────────────────────────────────────────────────

export function ChapterList({
  chapters,
  selectedIndex,
  onSelect,
  onGenerate,
  generatingChapter,
  collapsed = false,
}: ChapterListProps) {
  const isAnyGenerating = generatingChapter !== null

  // First pending chapter for "Generate Next" button
  const firstPendingChapter = chapters.find((ch) => ch.status === 'pending')

  // Refs for auto-scrolling
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<Map<number, HTMLLIElement>>(new Map())

  // Auto-scroll selected chapter into view
  useEffect(() => {
    const item = itemRefs.current.get(selectedIndex)
    if (item) {
      item.scrollIntoView({ block: 'start', behavior: 'smooth' })
    }
  }, [selectedIndex])

  // ── Collapsed mode: thin number strip ──────────────────────────────────
  if (collapsed) {
    return (
      <div className="flex h-full flex-col items-center py-2 overflow-y-auto" ref={scrollContainerRef}>
        {chapters.map((chapter, index) => {
          const isSelected = index === selectedIndex
          const config = STATUS_CONFIG[chapter.status]

          return (
            <li
              key={chapter.number}
              ref={(el) => {
                if (el) itemRefs.current.set(index, el)
                else itemRefs.current.delete(index)
              }}
              className="list-none w-full flex justify-center"
            >
              <div className="flex items-center gap-1 my-0.5">
                {/* Status dot — sits to the left of the number */}
                <span
                  className={cn(
                    'h-1.5 w-1.5 shrink-0 rounded-full',
                    chapter.hasConflict ? 'bg-destructive animate-pulse' : config.dotColor,
                    chapter.status === 'generating' && !chapter.hasConflict && 'animate-pulse'
                  )}
                />
                <button
                  onClick={() => onSelect(index)}
                  title={`Ch ${chapter.number}: ${chapter.title}`}
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full text-xs font-mono font-medium transition-colors',
                    isSelected
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  {chapter.number}
                </button>
              </div>
            </li>
          )
        })}
      </div>
    )
  }

  // ── Full mode: standard chapter list ───────────────────────────────────
  return (
    <div className="flex h-full flex-col">
      {/* Generate Next button */}
      {firstPendingChapter && (
        <div className="border-b border-border p-4">
          <button
            onClick={() => onGenerate(firstPendingChapter.number)}
            disabled={isAnyGenerating}
            className={cn(
              'flex w-full items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors',
              'bg-primary text-primary-foreground hover:bg-primary/90',
              'disabled:pointer-events-none disabled:opacity-50'
            )}
          >
            {isAnyGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Generate Next Chapter
          </button>
        </div>
      )}

      {/* Scrollable chapter list */}
      <div className="flex-1 overflow-y-auto" ref={scrollContainerRef}>
        <ul className="flex flex-col gap-1 p-2">
          {chapters.map((chapter, index) => {
            const isSelected = index === selectedIndex
            const isGeneratingThis = generatingChapter === chapter.number

            return (
              <li
                key={chapter.number}
                ref={(el) => {
                  if (el) itemRefs.current.set(index, el)
                  else itemRefs.current.delete(index)
                }}
              >
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelect(index)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(index) } }}
                  className={cn(
                    'flex w-full cursor-pointer items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
                    isSelected
                      ? 'bg-muted/80 shadow-sm ring-1 ring-border'
                      : 'hover:bg-muted/40'
                  )}
                >
                  {/* Chapter number */}
                  <span className="mt-0.5 w-7 shrink-0 font-mono text-xs text-muted-foreground">
                    {String(chapter.number).padStart(2, '0')}
                  </span>

                  {/* Center: title, badge, word count */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium leading-snug text-foreground">
                      {chapter.title}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <StatusBadge status={chapter.status} />
                      {chapter.hasConflict && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-destructive/10 px-1.5 py-0.5 text-xs font-medium text-destructive">
                          <AlertTriangle className="h-3 w-3" />
                          Conflict
                        </span>
                      )}
                      {chapter.isAffected && !chapter.hasConflict && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-xs font-medium text-amber-600">
                          <AlertTriangle className="h-3 w-3" />
                          Affected
                        </span>
                      )}
                      {chapter.hasText && (
                        <span className="text-xs text-muted-foreground">
                          {chapter.wordCount.toLocaleString()} words
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: Generate button or spinner */}
                  {chapter.status === 'pending' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onGenerate(chapter.number)
                      }}
                      disabled={isAnyGenerating}
                      className={cn(
                        'mt-0.5 shrink-0 rounded-md border border-border px-2 py-1 text-xs font-medium transition-colors',
                        'hover:bg-muted disabled:pointer-events-none disabled:opacity-40',
                        'flex items-center gap-1 text-muted-foreground'
                      )}
                    >
                      <Sparkles className="h-3 w-3" />
                      Generate
                    </button>
                  )}
                  {isGeneratingThis && (
                    <div className="mt-0.5 shrink-0">
                      <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                    </div>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

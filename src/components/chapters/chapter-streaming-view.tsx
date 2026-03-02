'use client'

import { useEffect, useRef } from 'react'
import { Pause, Play, Square, AlertCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

interface ChapterStreamingViewProps {
  chapterNumber: number
  chapterTitle: string
  streamedText: string
  isStreaming: boolean
  isPaused: boolean
  wordCount: number
  error: string | null
  onPause: () => void
  onStop: () => void
  onResume: () => void
  onRetry: () => void
}

// ──────────────────────────────────────────────────────────────────────────────
// ChapterStreamingView
// ──────────────────────────────────────────────────────────────────────────────

export function ChapterStreamingView({
  chapterNumber,
  chapterTitle,
  streamedText,
  isStreaming,
  isPaused,
  wordCount,
  error,
  onPause,
  onStop,
  onResume,
  onRetry,
}: ChapterStreamingViewProps) {
  const sentinelRef = useRef<HTMLDivElement>(null)
  const proseContainerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom during streaming (not after pause — let user read)
  useEffect(() => {
    if (isStreaming && sentinelRef.current) {
      sentinelRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [streamedText, isStreaming])

  // Split prose into paragraphs on double newlines
  const paragraphs = streamedText
    ? streamedText.split(/\n\n/).filter((p) => p.trim().length > 0)
    : []

  const hasText = streamedText.trim().length > 0
  const isDone = hasText && !isStreaming && !isPaused && !error

  return (
    <div className="flex h-full flex-col">
      {/* ── Header bar ── */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold text-foreground">
            Chapter {chapterNumber}: {chapterTitle}
          </h2>
        </div>

        <div className="ml-3 flex shrink-0 items-center gap-2">
          {/* Live word count badge */}
          {hasText && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {wordCount.toLocaleString()} words
            </span>
          )}

          {/* Streaming status indicator */}
          {isStreaming && (
            <span className="flex items-center gap-1.5 text-xs text-green-500">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
              </span>
              Generating
            </span>
          )}
          {isPaused && (
            <span className="flex items-center gap-1.5 text-xs text-amber-500">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              Paused
            </span>
          )}
        </div>
      </div>

      {/* ── Prose area ── */}
      <div
        ref={proseContainerRef}
        className="flex-1 overflow-y-auto px-6 py-5"
      >
        {/* Empty state */}
        {!hasText && !error && (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-muted-foreground">
              {isStreaming
                ? 'Writing...'
                : 'Select a chapter and click Generate to begin.'}
            </p>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="mb-4 flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-destructive">
                Generation failed
              </p>
              <p className="mt-0.5 text-sm text-destructive/80">{error}</p>
            </div>
          </div>
        )}

        {/* Prose paragraphs */}
        {hasText && (
          <div className="prose prose-sm max-w-none dark:prose-invert">
            {paragraphs.map((paragraph, i) => {
              const isLastParagraph = i === paragraphs.length - 1
              return (
                <p key={i} className="mb-4 leading-relaxed text-foreground">
                  {paragraph}
                  {/* Typing cursor on the last paragraph when streaming */}
                  {isStreaming && isLastParagraph && (
                    <span
                      className="ml-0.5 inline-block h-[1em] w-[2px] align-text-bottom bg-foreground animate-pulse"
                      aria-hidden="true"
                    />
                  )}
                </p>
              )
            })}
          </div>
        )}

        {/* Sentinel for auto-scroll */}
        <div ref={sentinelRef} />
      </div>

      {/* ── Control bar ── */}
      <div className="border-t border-border px-4 py-3">
        {/* Streaming controls */}
        {isStreaming && (
          <div className="flex items-center gap-2">
            <button
              onClick={onPause}
              className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted"
            >
              <Pause className="h-3.5 w-3.5" />
              Pause
            </button>
            <button
              onClick={onStop}
              className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/5"
            >
              <Square className="h-3.5 w-3.5" />
              Stop
            </button>
            <Loader2 className="ml-auto h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Paused controls */}
        {isPaused && !isStreaming && (
          <div className="flex items-center gap-2">
            <button
              onClick={onResume}
              className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Play className="h-3.5 w-3.5" />
              Resume
            </button>
            <button
              onClick={onStop}
              className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/5"
            >
              <Square className="h-3.5 w-3.5" />
              Stop
            </button>
            <span className="ml-auto text-xs text-muted-foreground">
              Generation paused. Text is preserved.
            </span>
          </div>
        )}

        {/* Error controls */}
        {error && (
          <div className="flex items-center gap-2">
            <button
              onClick={onRetry}
              className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Retry
            </button>
          </div>
        )}

        {/* Idle / done state */}
        {isDone && (
          <p className="text-sm text-muted-foreground">
            Chapter generated. {wordCount.toLocaleString()} words.
          </p>
        )}
      </div>
    </div>
  )
}

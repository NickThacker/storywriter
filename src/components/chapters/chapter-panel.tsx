'use client'

import { useState, useEffect, useCallback } from 'react'
import { useChapterStream } from '@/hooks/use-chapter-stream'
import { saveChapterProse, updateProjectWordCount } from '@/actions/chapters'
import { ChapterList } from '@/components/chapters/chapter-list'
import { ChapterStreamingView } from '@/components/chapters/chapter-streaming-view'
import { ChapterEditor } from '@/components/chapters/chapter-editor'
import { RewriteDialog } from '@/components/chapters/rewrite-dialog'
import { PhaseNav } from '@/components/chapters/phase-nav'
import { ProgressBar } from '@/components/chapters/progress-bar'
import { toast } from 'sonner'
import type { OutlineChapter } from '@/types/database'
import type { ChapterCheckpointRow } from '@/types/project-memory'
import type { ChapterListItem } from '@/components/chapters/chapter-list'

// ──────────────────────────────────────────────────────────────────────────────
// Props
// ──────────────────────────────────────────────────────────────────────────────

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

// ──────────────────────────────────────────────────────────────────────────────
// ChapterPanel — top-level client orchestrator
// ──────────────────────────────────────────────────────────────────────────────

export function ChapterPanel({
  projectId,
  projectTitle,
  outlineChapters,
  checkpoints,
  chapterCount,
  targetLength,
  projectWordCount,
  chaptersDone,
}: ChapterPanelProps) {
  // ── State ────────────────────────────────────────────────────────────────

  const [selectedIndex, setSelectedIndex] = useState(0)

  // Checkpoint map: chapter_number → row (for O(1) lookup)
  const [checkpointMap, setCheckpointMap] = useState<Map<number, ChapterCheckpointRow>>(
    () => new Map(checkpoints.map((c) => [c.chapter_number, c]))
  )

  const [generatingChapter, setGeneratingChapter] = useState<number | null>(null)
  const [rewriteOpen, setRewriteOpen] = useState(false)
  const [rewriteChapter, setRewriteChapter] = useState<number | null>(null)

  const [localWordCount, setLocalWordCount] = useState(projectWordCount)
  const [localChaptersDone, setLocalChaptersDone] = useState(chaptersDone)

  // Track whether we've already triggered compression for the current stream
  const [compressionTriggered, setCompressionTriggered] = useState(false)

  // ── Streaming hook ───────────────────────────────────────────────────────

  const { streamedText, isStreaming, isPaused, error, wordCount, startStream, pause, stop } =
    useChapterStream()

  // ── Derive chapter list items ────────────────────────────────────────────

  function deriveChapterList(): ChapterListItem[] {
    return outlineChapters.map((ch) => {
      const checkpoint = checkpointMap.get(ch.number)
      const wc = checkpoint?.chapter_text
        ? checkpoint.chapter_text.trim().split(/\s+/).filter(Boolean).length
        : 0
      let status: ChapterListItem['status'] = 'pending'
      if (generatingChapter === ch.number) {
        status = 'generating'
      } else if (checkpoint && checkpoint.chapter_text) {
        status = 'checkpoint'
      }
      return {
        number: ch.number,
        title: ch.title,
        status,
        wordCount: wc,
        hasText: !!checkpoint?.chapter_text,
      }
    })
  }

  // ── Generation flow ──────────────────────────────────────────────────────

  const handleGenerate = useCallback(
    (chapterNumber: number, adjustments?: string) => {
      setGeneratingChapter(chapterNumber)
      setCompressionTriggered(false)
      void startStream(projectId, chapterNumber, adjustments)
    },
    [projectId, startStream]
  )

  // Watch for stream completion → trigger compression pass
  useEffect(() => {
    if (!isStreaming && streamedText && generatingChapter !== null && !compressionTriggered) {
      setCompressionTriggered(true)

      const chapterNumber = generatingChapter
      const chapter = outlineChapters.find((c) => c.number === chapterNumber)
      const chapterTitle = chapter?.title ?? `Chapter ${chapterNumber}`

      void (async () => {
        try {
          const response = await fetch('/api/generate/compress-chapter', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              projectId,
              chapterNumber,
              chapterTitle,
              chapterText: streamedText,
            }),
          })

          if (!response.ok) {
            let errMsg = `Compression failed (${response.status})`
            try {
              const body = (await response.json()) as { error?: string }
              if (body.error) errMsg = body.error
            } catch {
              // ignore
            }
            toast.error(errMsg)
            // Keep the streamed text visible — don't clear generatingChapter
            return
          }

          // Update local checkpoint map with new text
          setCheckpointMap((prev) => {
            const next = new Map(prev)
            const existing = next.get(chapterNumber)
            if (existing) {
              next.set(chapterNumber, { ...existing, chapter_text: streamedText })
            } else {
              // Create minimal checkpoint row for display
              next.set(chapterNumber, {
                id: '',
                project_id: projectId,
                chapter_number: chapterNumber,
                summary: '',
                state_diff: {
                  newThreads: [],
                  advancedThreads: [],
                  resolvedThreads: [],
                  characterChanges: {},
                  newContinuityFacts: [],
                  newForeshadowing: [],
                },
                continuity_notes: [],
                chapter_text: streamedText,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
            }
            return next
          })

          // Sync word count totals
          const wordCountResult = await updateProjectWordCount(projectId)
          if ('error' in wordCountResult) {
            toast.error(`Word count update failed: ${wordCountResult.error}`)
          } else {
            setLocalWordCount(wordCountResult.wordCount)
            setLocalChaptersDone(wordCountResult.chaptersDone)
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Compression failed'
          toast.error(msg)
        } finally {
          setGeneratingChapter(null)
        }
      })()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStreaming, streamedText])

  // ── Editor save handler ───────────────────────────────────────────────────

  const handleEditorSave = useCallback(
    async (text: string) => {
      const chapterNumber = outlineChapters[selectedIndex]?.number
      if (!chapterNumber) return

      await saveChapterProse(projectId, chapterNumber, text)

      // Update local checkpoint map
      setCheckpointMap((prev) => {
        const next = new Map(prev)
        const existing = next.get(chapterNumber)
        if (existing) {
          next.set(chapterNumber, { ...existing, chapter_text: text })
        }
        return next
      })
    },
    [projectId, selectedIndex, outlineChapters]
  )

  // ── Rewrite flow ─────────────────────────────────────────────────────────

  const handleRewriteRequest = useCallback((chapterNumber: number) => {
    setRewriteChapter(chapterNumber)
    setRewriteOpen(true)
  }, [])

  const handleRewrite = useCallback(
    (adjustments: string) => {
      if (rewriteChapter === null) return
      handleGenerate(rewriteChapter, adjustments)
    },
    [rewriteChapter, handleGenerate]
  )

  // ── Retry / resume helpers ───────────────────────────────────────────────

  const handleRetry = useCallback(() => {
    if (generatingChapter !== null) {
      setCompressionTriggered(false)
      void startStream(projectId, generatingChapter)
    }
  }, [generatingChapter, projectId, startStream])

  const handleResume = useCallback(() => {
    if (generatingChapter !== null) {
      void startStream(projectId, generatingChapter)
    }
  }, [generatingChapter, projectId, startStream])

  // ── Derived data ─────────────────────────────────────────────────────────

  const chapterListItems = deriveChapterList()

  const selectedChapter = outlineChapters[selectedIndex]
  const selectedCheckpoint = selectedChapter
    ? checkpointMap.get(selectedChapter.number)
    : undefined

  // Show streaming view when generating or when stream just completed (before compression finishes)
  const showStreamingView = generatingChapter !== null || (isStreaming && streamedText.length > 0)

  // ── Rewrite chapter context ───────────────────────────────────────────────

  const rewriteChapterData = rewriteChapter !== null
    ? outlineChapters.find((c) => c.number === rewriteChapter)
    : null

  return (
    <div className="flex h-full flex-col">
      {/* Phase navigation */}
      <PhaseNav projectId={projectId} currentPhase="chapters" />

      {/* Progress bar */}
      <ProgressBar
        chaptersDone={localChaptersDone}
        totalChapters={chapterCount}
        wordCount={localWordCount}
        targetLength={targetLength}
      />

      {/* Two-panel layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel: Chapter list (~30%) */}
        <div className="w-[30%] shrink-0 border-r overflow-hidden flex flex-col">
          <ChapterList
            chapters={chapterListItems}
            selectedIndex={selectedIndex}
            onSelect={setSelectedIndex}
            onGenerate={handleGenerate}
            generatingChapter={generatingChapter}
          />
        </div>

        {/* Right panel: Streaming view OR editor OR empty state (~70%) */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {showStreamingView && generatingChapter !== null ? (
            <div className="flex h-full flex-col">
              <ChapterStreamingView
                chapterNumber={generatingChapter}
                chapterTitle={
                  outlineChapters.find((c) => c.number === generatingChapter)?.title ??
                  `Chapter ${generatingChapter}`
                }
                streamedText={streamedText}
                isStreaming={isStreaming}
                isPaused={isPaused}
                wordCount={wordCount}
                error={error}
                onPause={pause}
                onStop={stop}
                onResume={handleResume}
                onRetry={handleRetry}
              />
              {/* Rewrite button in streaming view footer (visible for chapters with existing text) */}
              {checkpointMap.has(generatingChapter) && !isStreaming && !isPaused && (
                <div className="border-t px-4 py-2 flex justify-end">
                  <button
                    onClick={() => handleRewriteRequest(generatingChapter)}
                    className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline transition-colors"
                  >
                    Rewrite with adjustments
                  </button>
                </div>
              )}
            </div>
          ) : selectedCheckpoint?.chapter_text ? (
            <div className="flex h-full flex-col">
              {/* Editor header with rewrite button */}
              <div className="flex items-center justify-between border-b px-4 py-2.5">
                <h2 className="text-sm font-semibold truncate">
                  Chapter {selectedChapter?.number}: {selectedChapter?.title}
                </h2>
                <button
                  onClick={() =>
                    selectedChapter && handleRewriteRequest(selectedChapter.number)
                  }
                  className="ml-3 shrink-0 text-xs rounded-md border border-border px-2.5 py-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  Rewrite
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                <ChapterEditor
                  initialContent={selectedCheckpoint.chapter_text}
                  onSave={handleEditorSave}
                />
              </div>
            </div>
          ) : (
            // Empty state
            <div className="flex h-full items-center justify-center p-8">
              <div className="text-center text-muted-foreground max-w-xs">
                <p className="text-sm font-medium">{projectTitle}</p>
                <p className="mt-1 text-sm">
                  Select a chapter and click Generate to start writing.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Rewrite dialog */}
      {rewriteChapterData && (
        <RewriteDialog
          chapterNumber={rewriteChapterData.number}
          chapterTitle={rewriteChapterData.title}
          open={rewriteOpen}
          onOpenChange={setRewriteOpen}
          onRewrite={handleRewrite}
        />
      )}
    </div>
  )
}

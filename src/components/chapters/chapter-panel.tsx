'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useChapterStream } from '@/hooks/use-chapter-stream'
import { saveChapterProse, updateProjectWordCount, approveChapter } from '@/actions/chapters'
import { ChapterList } from '@/components/chapters/chapter-list'
import { ChapterStreamingView } from '@/components/chapters/chapter-streaming-view'
import { ChapterEditor } from '@/components/chapters/chapter-editor'
import { ChapterReadingView } from '@/components/chapters/chapter-reading-view'
import { RewriteDialog } from '@/components/chapters/rewrite-dialog'
import { CheckpointPanel } from '@/components/chapters/checkpoint-panel'
import { ProgressBar } from '@/components/chapters/progress-bar'
import { useGenerationGuard } from '@/components/chapters/generation-guard-context'
import { detectScenes } from '@/lib/checkpoint/scene-utils'
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

  // Reading mode vs editing mode
  const [editingChapter, setEditingChapter] = useState<number | null>(null)
  const [focusMode, setFocusMode] = useState(false)

  // ── Streaming hook ───────────────────────────────────────────────────────

  const { streamedText, isStreaming, isPaused, error, wordCount, startStream, pause, stop } =
    useChapterStream()

  // ── Generation guard — prevent accidental navigation ───────────────────

  const { setGenerating } = useGenerationGuard()

  useEffect(() => {
    setGenerating(isStreaming)

    if (!isStreaming) return

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isStreaming, setGenerating])

  // Clear guard on unmount
  useEffect(() => {
    return () => setGenerating(false)
  }, [setGenerating])

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
      } else if (checkpoint?.chapter_text) {
        status = (checkpoint.approval_status ?? 'draft') === 'approved' ? 'approved' : 'checkpoint'
      }
      return {
        number: ch.number,
        title: ch.title,
        status,
        wordCount: wc,
        hasText: !!checkpoint?.chapter_text,
        isAffected: checkpoint?.affected ?? false,
      }
    })
  }

  // ── Generation flow ──────────────────────────────────────────────────────

  const handleGenerate = useCallback(
    (chapterNumber: number, adjustments?: string) => {
      // Inject direction from previous chapter's checkpoint if available
      const prevCheckpoint = checkpointMap.get(chapterNumber - 1)
      const directionContext = prevCheckpoint?.direction_for_next

      const fullAdjustments = [directionContext, adjustments]
        .filter(Boolean)
        .join('\n\n')

      setGeneratingChapter(chapterNumber)
      setCompressionTriggered(false)
      void startStream(projectId, chapterNumber, fullAdjustments || undefined)
    },
    [projectId, startStream, checkpointMap]
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

          // CRITICAL: Update checkpoint map BEFORE clearing generatingChapter (Pitfall 1)
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
                // Phase 4: Creative Checkpoint defaults
                approval_status: 'draft' as const,
                direction_options: null,
                selected_direction: null,
                direction_for_next: null,
                affected: false,
                impact_description: null,
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

          // Show toast after checkpoint map is updated — with Review action button
          const idx = outlineChapters.findIndex((c) => c.number === chapterNumber)
          toast.success('Chapter ready — Review checkpoint', {
            action: {
              label: 'Review',
              onClick: () => {
                if (idx >= 0) handleSelectChapter(idx)
              },
            },
            duration: 8000,
          })
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

  // ── Approve flow ─────────────────────────────────────────────────────────

  const handleApprove = useCallback(
    async (chapterNumber: number) => {
      // Optimistic update
      setCheckpointMap((prev) => {
        const next = new Map(prev)
        const existing = next.get(chapterNumber)
        if (existing) {
          next.set(chapterNumber, {
            ...existing,
            approval_status: 'approved' as const,
            affected: false,
            impact_description: null,
          })
        }
        return next
      })

      // Persist
      const result = await approveChapter(projectId, chapterNumber)
      if ('error' in result) {
        toast.error(`Failed to approve: ${result.error}`)
        // Roll back optimistic update
        setCheckpointMap((prev) => {
          const next = new Map(prev)
          const existing = next.get(chapterNumber)
          if (existing) {
            next.set(chapterNumber, { ...existing, approval_status: 'draft' as const })
          }
          return next
        })
      }
    },
    [projectId]
  )

  // ── Direction saved callback ──────────────────────────────────────────────

  const handleDirectionSaved = useCallback((chapterNumber: number, directionForNext: string) => {
    setCheckpointMap((prev) => {
      const next = new Map(prev)
      const existing = next.get(chapterNumber)
      if (existing) {
        next.set(chapterNumber, { ...existing, direction_for_next: directionForNext })
      }
      return next
    })
  }, [])

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

  // Plot thread stats from state_diff data across all checkpoints (approximate for v1)
  const plotThreadStats = useMemo(() => {
    let resolved = 0
    let total = 0
    checkpointMap.forEach((cp) => {
      const diff = cp.state_diff
      if (diff) {
        resolved += diff.resolvedThreads?.length ?? 0
        total += diff.newThreads?.length ?? 0
      }
    })
    // open = total new threads introduced minus resolved (approximate)
    return { resolved, open: Math.max(0, total - resolved) }
  }, [checkpointMap])

  // Reset editing/focus when switching chapters
  const handleSelectChapter = useCallback((index: number) => {
    setSelectedIndex(index)
    setEditingChapter(null)
    setFocusMode(false)
  }, [])

  const selectedChapter = outlineChapters[selectedIndex]
  const selectedCheckpoint = selectedChapter
    ? checkpointMap.get(selectedChapter.number)
    : undefined

  // Handle scene-level rewrites — must be declared after selectedCheckpoint
  const handleSceneRewrite = useCallback(
    (sceneIndex: number, adjustments: string) => {
      if (!selectedCheckpoint?.chapter_text) return
      const scenes = detectScenes(selectedCheckpoint.chapter_text)
      if (!scenes || !scenes[sceneIndex]) return

      const scene = scenes[sceneIndex]
      const sceneAdjustments = [
        `SCENE-LEVEL REWRITE: Rewrite ONLY Scene ${sceneIndex + 1} of this chapter. Keep all other scenes exactly as they are.`,
        `Scene to rewrite:\n${scene.text}`,
        adjustments,
      ]
        .filter(Boolean)
        .join('\n\n')

      handleRewrite(sceneAdjustments)
    },
    [selectedCheckpoint, handleRewrite]
  )

  // Show streaming view when generating or when stream just completed (before compression finishes)
  const showStreamingView = generatingChapter !== null || (isStreaming && streamedText.length > 0)

  // Show checkpoint panel when chapter has text, is not editing/streaming, and:
  // - Chapter is not yet approved (standard checkpoint flow), OR
  // - Chapter is the last chapter AND is approved (shows NovelCompleteSummary)
  const showCheckpoint = useMemo(() => {
    if (showStreamingView) return false
    if (!selectedCheckpoint?.chapter_text) return false
    if (editingChapter === selectedChapter?.number) return false

    const isApproved = (selectedCheckpoint.approval_status ?? 'draft') === 'approved'
    const isLast = selectedChapter?.number === outlineChapters.length

    // Show for unapproved chapters (normal flow), or last chapter when approved (completion summary)
    return !isApproved || isLast
  }, [showStreamingView, selectedCheckpoint, editingChapter, selectedChapter, outlineChapters])

  // ── Rewrite chapter context ───────────────────────────────────────────────

  const rewriteChapterData = rewriteChapter !== null
    ? outlineChapters.find((c) => c.number === rewriteChapter)
    : null

  return (
    <div className="flex h-full flex-col">
      {/* Progress bar */}
      <div
        className="transition-all duration-500 ease-in-out overflow-hidden"
        style={{ maxHeight: focusMode ? 0 : 200, opacity: focusMode ? 0 : 1 }}
      >
        <ProgressBar
          chaptersDone={localChaptersDone}
          totalChapters={chapterCount}
          wordCount={localWordCount}
          targetLength={targetLength}
        />
      </div>

      {/* Two-panel layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel: Chapter list — collapses in focus mode */}
        <div
          className="shrink-0 border-r border-border overflow-hidden flex flex-col transition-all duration-500 ease-in-out"
          style={{ width: focusMode ? 0 : '30%', minWidth: focusMode ? 0 : undefined, opacity: focusMode ? 0 : 1, borderRightWidth: focusMode ? 0 : undefined }}
        >
          <ChapterList
            chapters={chapterListItems}
            selectedIndex={selectedIndex}
            onSelect={handleSelectChapter}
            onGenerate={handleGenerate}
            generatingChapter={generatingChapter}
          />
        </div>

        {/* Right panel: main content area + checkpoint slide-in panel */}
        <div className="flex flex-1 overflow-hidden">
          {/* Main content area — shrinks when checkpoint is open */}
          <div
            className="flex flex-col overflow-hidden transition-all duration-300 ease-in-out"
            style={{ width: showCheckpoint ? '55%' : '100%' }}
          >
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
                  <div className="border-t border-border px-4 py-2 flex justify-end">
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
                {/* Header with actions */}
                <div className="flex items-center justify-between border-b border-border px-6 py-3">
                  <h2 className="text-sm font-semibold truncate">
                    Chapter {selectedChapter?.number}: {selectedChapter?.title}
                  </h2>
                  <div className="ml-3 flex shrink-0 items-center gap-2">
                    {editingChapter === selectedChapter?.number ? (
                      <button
                        onClick={() => setEditingChapter(null)}
                        className="text-xs rounded-md border border-border px-2.5 py-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      >
                        Done Editing
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => setFocusMode((p) => !p)}
                          className={`text-xs rounded-md border px-2.5 py-1 transition-colors ${focusMode ? 'border-primary/40 bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted'}`}
                        >
                          Focus
                        </button>
                        <button
                          onClick={() => selectedChapter && setEditingChapter(selectedChapter.number)}
                          className="text-xs rounded-md border border-border px-2.5 py-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() =>
                            selectedChapter && handleRewriteRequest(selectedChapter.number)
                          }
                          className="text-xs rounded-md border border-border px-2.5 py-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        >
                          Rewrite
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Reading view or Editor */}
                {editingChapter === selectedChapter?.number ? (
                  <div className="flex-1 overflow-hidden">
                    <ChapterEditor
                      key={selectedChapter?.number}
                      initialContent={selectedCheckpoint.chapter_text}
                      onSave={handleEditorSave}
                    />
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto">
                    <div className={`mx-auto max-w-2xl px-8 py-8 ${focusMode ? '' : ''}`}>
                      <ChapterReadingView
                        text={selectedCheckpoint.chapter_text}
                        wordCount={
                          selectedCheckpoint.chapter_text.trim().split(/\s+/).filter(Boolean).length
                        }
                        onClickToEdit={() => selectedChapter && setEditingChapter(selectedChapter.number)}
                      />
                    </div>
                  </div>
                )}
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

          {/* Checkpoint panel — slides in from right */}
          <div
            className="shrink-0 border-l border-border transition-all duration-300 ease-in-out overflow-hidden"
            style={{ width: showCheckpoint ? '45%' : 0, opacity: showCheckpoint ? 1 : 0 }}
          >
            {showCheckpoint && selectedChapter && selectedCheckpoint && (
              <CheckpointPanel
                projectId={projectId}
                chapter={selectedChapter}
                checkpoint={selectedCheckpoint}
                outlineChapters={outlineChapters}
                isLastChapter={selectedChapter.number === outlineChapters.length}
                onApprove={handleApprove}
                onRewrite={handleRewriteRequest}
                onDirectionSaved={handleDirectionSaved}
                projectTitle={projectTitle}
                totalWordCount={localWordCount}
                totalChapters={chapterCount}
                plotThreadStats={plotThreadStats}
              />
            )}
          </div>
        </div>
      </div>

      {/* Rewrite dialog */}
      {rewriteChapterData && (
        <RewriteDialog
          chapterNumber={rewriteChapterData.number}
          chapterTitle={rewriteChapterData.title}
          chapterText={selectedCheckpoint?.chapter_text ?? ''}
          open={rewriteOpen}
          onOpenChange={setRewriteOpen}
          onRewrite={handleRewrite}
          onSceneRewrite={handleSceneRewrite}
        />
      )}
    </div>
  )
}

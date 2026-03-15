'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Loader2 } from 'lucide-react'
import { useChapterStream } from '@/hooks/use-chapter-stream'
import { saveChapterProse, updateProjectWordCount, approveChapter, getChapterCheckpoints } from '@/actions/chapters'
import { ChapterList } from '@/components/chapters/chapter-list'
import { ChapterStreamingView, type OracleStatus } from '@/components/chapters/chapter-streaming-view'
import { ChapterEditor } from '@/components/chapters/chapter-editor'
import { ChapterReadingView } from '@/components/chapters/chapter-reading-view'
import { RewriteDialog } from '@/components/chapters/rewrite-dialog'
import { CheckpointPanel } from '@/components/chapters/checkpoint-panel'
import { ProgressBar } from '@/components/chapters/progress-bar'
import { useGenerationGuard } from '@/components/chapters/generation-guard-context'
import { detectScenes } from '@/lib/checkpoint/scene-utils'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
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
  const [analyzingEdit, setAnalyzingEdit] = useState(false)
  const [saveMessageIdx, setSaveMessageIdx] = useState(0)
  const saveMessageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [oracleStatus, setOracleStatus] = useState<OracleStatus>('idle')
  const [analysisRunningFor, setAnalysisRunningFor] = useState<number | null>(null)
  const [auditRunningFor, setAuditRunningFor] = useState<number | null>(null)
  const [conflictChapters, setConflictChapters] = useState<Set<number>>(new Set())
  // Map of chapterNumber → conflicting fact strings for text highlighting
  const [conflictHighlights, setConflictHighlights] = useState<Map<number, string[]>>(new Map())

  // Derive word count and chapters done from checkpointMap so they update
  // in realtime when chapters are edited, generated, or rewritten.
  const { localWordCount, localChaptersDone } = useMemo(() => {
    let totalWords = 0
    let chaptersWithText = 0
    checkpointMap.forEach((cp) => {
      const text = cp.chapter_text ?? ''
      if (text.trim().length > 0) {
        totalWords += text.trim().split(/\s+/).filter(Boolean).length
        chaptersWithText += 1
      }
    })
    return { localWordCount: totalWords, localChaptersDone: chaptersWithText }
  }, [checkpointMap])

  // Track whether we've already triggered compression for the current stream
  const [compressionTriggered, setCompressionTriggered] = useState(false)

  // Reading mode vs editing mode
  const [editingChapter, setEditingChapter] = useState<number | null>(null)
  const [focusMode, setFocusMode] = useState(false)

  // ── Streaming hook ───────────────────────────────────────────────────────

  const { streamedText, isStreaming, error, wordCount, startStream, stop, continuityConflict, clearContinuityConflict } =
    useChapterStream()

  // ── Generation guard — prevent accidental navigation ───────────────────

  const { setGenerating } = useGenerationGuard()

  useEffect(() => {
    setGenerating(isStreaming)
    if (isStreaming && oracleStatus === 'loading') setOracleStatus('ready')
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

  // ── Save status message rotation ─────────────────────────────────────────

  const SAVE_MESSAGES = ['Saving...', 'Analyzing chapter...', 'Updating memory...', 'Almost done...']

  useEffect(() => {
    if (!analyzingEdit) {
      setSaveMessageIdx(0)
      if (saveMessageTimerRef.current) clearTimeout(saveMessageTimerRef.current)
      return
    }
    const advance = (idx: number) => {
      const next = Math.min(idx + 1, SAVE_MESSAGES.length - 1)
      setSaveMessageIdx(next)
      if (next < SAVE_MESSAGES.length - 1) {
        saveMessageTimerRef.current = setTimeout(() => advance(next), 5000)
      }
    }
    saveMessageTimerRef.current = setTimeout(() => advance(0), 3000)
    return () => {
      if (saveMessageTimerRef.current) clearTimeout(saveMessageTimerRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analyzingEdit])

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
        hasConflict: conflictChapters.has(ch.number),
      }
    })
  }

  // ── Chapter analysis ─────────────────────────────────────────────────────

  // Background analysis after generation — updates memory then refreshes checkpoint stats.
  const fireAnalysis = useCallback(
    (chapterNumber: number, chapterText: string) => {
      setAnalysisRunningFor(chapterNumber)
      void (async () => {
        try {
          const res = await fetch('/api/generate/analyze-chapter', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId, chapterNumber, chapterText }),
          })
          if (res.ok) {
            // Re-fetch checkpoints to pick up updated state_diff + summary
            const refreshed = await getChapterCheckpoints(projectId)
            if (!('error' in refreshed)) {
              setCheckpointMap(new Map(refreshed.data.map((c) => [c.chapter_number, c])))
            }
          }
        } catch (err) {
          console.error('[chapter-panel] analyze-chapter error:', err)
        } finally {
          setAnalysisRunningFor(null)
        }
      })()
    },
    [projectId]
  )

  // Background manuscript audit — Gemini reviews full manuscript against outline + memory
  const fireAudit = useCallback(
    (chapterNumber: number) => {
      setAuditRunningFor(chapterNumber)
      void (async () => {
        try {
          const res = await fetch('/api/generate/manuscript-audit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId, chapterNumber }),
          })
          if (res.ok) {
            const audit = await res.json()
            const corrections = (audit.threadCorrections?.length ?? 0) + (audit.foreshadowingCorrections?.length ?? 0)
            if (corrections > 0) {
              // Re-fetch checkpoints to pick up any memory-driven changes
              const refreshed = await getChapterCheckpoints(projectId)
              if (!('error' in refreshed)) {
                setCheckpointMap(new Map(refreshed.data.map((c: ChapterCheckpointRow) => [c.chapter_number, c])))
              }
            }
            const findings = audit.findings?.length ?? 0
            if (findings > 0 || corrections > 0) {
              console.log(`[chapter-panel] Audit: ${findings} findings, ${corrections} corrections applied`)
            }
          }
        } catch (err) {
          console.error('[chapter-panel] manuscript-audit error:', err)
        } finally {
          setAuditRunningFor(null)
        }
      })()
    },
    [projectId]
  )

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
      setOracleStatus('loading')
      setConflictChapters(new Set())
      setConflictHighlights(new Map())
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
              // Clear state_diff + summary so checkpoint panel shows spinners while analysis runs
              next.set(chapterNumber, { ...existing, chapter_text: streamedText, state_diff: null, summary: null })
            } else {
              // Create minimal checkpoint row for display — state_diff null until analysis completes
              next.set(chapterNumber, {
                id: '',
                project_id: projectId,
                chapter_number: chapterNumber,
                summary: null,
                state_diff: null,
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

          // Sync word count totals to DB (local display derives from checkpointMap)
          const wordCountResult = await updateProjectWordCount(projectId)
          if ('error' in wordCountResult) {
            toast.error(`Word count update failed: ${wordCountResult.error}`)
          }

          // Fire background analysis + manuscript audit in parallel
          fireAnalysis(chapterNumber, streamedText)
          fireAudit(chapterNumber)

          // Trigger arc synthesis every 5 chapters (fire-and-forget)
          if (chapterNumber % 5 === 0) {
            void fetch(`/api/arc/${projectId}/synthesize`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ chapterNumber }),
            }).catch((err) => console.error('[chapter-panel] arc synthesis error:', err))
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

  // Auto-save debounce target — saves prose only, no analysis.
  const handleEditorSave = useCallback(
    async (text: string) => {
      const chapterNumber = outlineChapters[selectedIndex]?.number
      if (!chapterNumber) return

      await saveChapterProse(projectId, chapterNumber, text)

      // Update local checkpoint map — triggers derived word count recalculation
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

  // "Done Editing" — save final text, run memory analysis (with spinner), then exit editor.
  const handleDoneEditing = useCallback(async () => {
    const chapterNumber = outlineChapters[selectedIndex]?.number
    const checkpoint = chapterNumber ? checkpointMap.get(chapterNumber) : undefined
    const text = checkpoint?.chapter_text ?? ''

    if (chapterNumber && text.trim()) {
      setAnalyzingEdit(true)
      try {
        await saveChapterProse(projectId, chapterNumber, text)
        await fetch('/api/generate/analyze-chapter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId, chapterNumber, chapterText: text }),
        })
      } catch (err) {
        console.error('[chapter-panel] analyze on done-editing error:', err)
      } finally {
        setAnalyzingEdit(false)
      }
    }

    setEditingChapter(null)
    await updateProjectWordCount(projectId)
  }, [projectId, selectedIndex, outlineChapters, checkpointMap])

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

  // Navigate to conflicting chapters and flag them
  const handleFixConflicts = useCallback(() => {
    if (!continuityConflict) return

    // Build a map of sourceChapter → conflicting fact strings for highlighting
    const highlightsMap = new Map<number, string[]>()
    const sourceChapters = new Set<number>()

    for (const issue of continuityConflict.issues) {
      // Use sourceChapter if the AI identified one, otherwise attribute to the
      // most recent chapter before the one we were trying to generate
      const ch = issue.sourceChapter ?? continuityConflict.pendingChapterNumber - 1
      if (ch >= 1) {
        sourceChapters.add(ch)
        const existing = highlightsMap.get(ch) ?? []
        existing.push(issue.conflictingFact)
        highlightsMap.set(ch, existing)
      }
    }

    // Fallback: if nothing was flagged, point at the chapter before generation target
    if (sourceChapters.size === 0) {
      const fallback = Math.max(1, continuityConflict.pendingChapterNumber - 1)
      sourceChapters.add(fallback)
    }

    setConflictChapters(sourceChapters)
    setConflictHighlights(highlightsMap)
    setGeneratingChapter(null)
    clearContinuityConflict()

    // Navigate to the earliest flagged chapter
    const earliest = Math.min(...sourceChapters)
    const idx = outlineChapters.findIndex((c) => c.number === earliest)
    if (idx >= 0) {
      handleSelectChapter(idx)
    }

    toast.info(`${sourceChapters.size} chapter${sourceChapters.size > 1 ? 's' : ''} flagged with continuity conflicts. Edit the text to resolve, then re-generate.`, { duration: 6000 })
  }, [continuityConflict, clearContinuityConflict, outlineChapters, handleSelectChapter])

  // Auto-fix: generate with conflict resolution instructions injected
  const handleAutoFixGenerate = useCallback(() => {
    if (!continuityConflict) return
    const { pendingProjectId, pendingChapterNumber, pendingAdjustments } = continuityConflict

    // Build conflict resolution instructions for the AI
    const issueLines = continuityConflict.issues
      .map((issue, i) => `${i + 1}. [${issue.severity.toUpperCase()}] ${issue.description}\n   Conflicting fact: ${issue.conflictingFact}\n   Suggested fix: ${issue.suggestedResolution}`)
      .join('\n')

    const fixInstructions = `CONTINUITY CONFLICTS TO RESOLVE:\nThe following conflicts were detected between the chapter plan and established story facts. You MUST resolve each one in your prose — do not contradict any established fact. Adjust the narrative to account for these:\n\n${issueLines}`

    const fullAdjustments = [pendingAdjustments, fixInstructions]
      .filter(Boolean)
      .join('\n\n')

    clearContinuityConflict()
    setConflictChapters(new Set())
    setConflictHighlights(new Map())
    setGeneratingChapter(pendingChapterNumber)
    setCompressionTriggered(false)
    setOracleStatus('loading')
    void startStream(pendingProjectId, pendingChapterNumber, fullAdjustments, true)
  }, [continuityConflict, clearContinuityConflict, startStream])

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

  // Show checkpoint panel when chapter has text, is not editing/streaming/focus, and:
  // - Chapter is not yet approved (standard checkpoint flow), OR
  // - Chapter is the last chapter AND is approved (shows NovelCompleteSummary)
  const showCheckpoint = useMemo(() => {
    if (focusMode) return false
    if (showStreamingView) return false
    if (!selectedCheckpoint?.chapter_text) return false
    if (editingChapter === selectedChapter?.number) return false

    const isApproved = (selectedCheckpoint.approval_status ?? 'draft') === 'approved'
    const isLast = selectedChapter?.number === outlineChapters.length

    // Show for unapproved chapters (normal flow), or last chapter when approved (completion summary)
    return !isApproved || isLast
  }, [focusMode, showStreamingView, selectedCheckpoint, editingChapter, selectedChapter, outlineChapters])

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
        {/* Left panel: Chapter list — collapses in focus mode, shrinks to number strip when checkpoint open */}
        <div
          className="shrink-0 border-r border-border overflow-hidden flex flex-col transition-all duration-500 ease-in-out"
          style={{
            width: focusMode ? 0 : showCheckpoint ? 52 : '30%',
            minWidth: focusMode ? 0 : showCheckpoint ? 52 : undefined,
            opacity: focusMode ? 0 : 1,
            borderRightWidth: focusMode ? 0 : undefined,
          }}
        >
          <ChapterList
            chapters={chapterListItems}
            selectedIndex={selectedIndex}
            onSelect={handleSelectChapter}
            onGenerate={handleGenerate}
            generatingChapter={generatingChapter}
            collapsed={showCheckpoint}
          />
        </div>

        {/* Right panel: main content area + checkpoint slide-in panel */}
        <div className="flex flex-1 overflow-hidden">
          {/* Main content area — flexes to fill remaining space */}
          <div
            className="flex flex-1 flex-col overflow-hidden transition-all duration-300 ease-in-out"
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
                  wordCount={wordCount}
                  error={error}
                  onStop={stop}
                  onRetry={handleRetry}
                  oracleStatus={oracleStatus}
                />
                {/* Rewrite button in streaming view footer (visible for chapters with existing text) */}
                {checkpointMap.has(generatingChapter) && !isStreaming && (
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
                        onClick={handleDoneEditing}
                        disabled={analyzingEdit}
                        className="flex items-center gap-1.5 text-xs rounded-md border border-border px-2.5 py-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-60 disabled:cursor-wait"
                      >
                        {analyzingEdit ? (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin" />
                            {SAVE_MESSAGES[saveMessageIdx]}
                          </>
                        ) : (
                          'Done Editing'
                        )}
                      </button>
                    ) : (
                      <>
                        {/* Memory analysis / audit indicator */}
                        {(analysisRunningFor === selectedChapter?.number || auditRunningFor === selectedChapter?.number) && (
                          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            {auditRunningFor === selectedChapter?.number ? 'Oracle thinking...' : 'Analyzing memory...'}
                          </span>
                        )}
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
                        conflictHighlights={selectedChapter ? conflictHighlights.get(selectedChapter.number) : undefined}
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
            style={{ width: showCheckpoint ? '38%' : 0, opacity: showCheckpoint ? 1 : 0 }}
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
                isAnalyzing={analysisRunningFor === selectedChapter.number}
                isAuditing={auditRunningFor === selectedChapter.number}
              />
            )}
          </div>
        </div>
      </div>

      {/* Continuity conflict dialog */}
      <Dialog
        open={continuityConflict !== null}
        onOpenChange={(open) => { if (!open) { setGeneratingChapter(null); clearContinuityConflict() } }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Continuity Conflict Detected</DialogTitle>
            <DialogDescription>
              The chapter outline conflicts with established story facts. Review the issues below, then fix the source chapters or generate anyway.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 max-h-80 overflow-y-auto py-1">
            {continuityConflict?.issues.map((issue, i) => (
              <div key={i} className="rounded-md border border-border p-3 space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                    issue.severity === 'high'
                      ? 'bg-destructive/10 text-destructive'
                      : issue.severity === 'medium'
                      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {issue.severity.toUpperCase()}
                  </span>
                  <p className="text-sm font-medium">{issue.description}</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium">Conflicting fact:</span> {issue.conflictingFact}
                  {issue.sourceChapter != null && (
                    <span className="ml-1 font-medium text-destructive">(Ch {issue.sourceChapter})</span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium">Suggestion:</span> {issue.suggestedResolution}
                </p>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleFixConflicts}>
              Go to source chapter
            </Button>
            <Button onClick={handleAutoFixGenerate}>
              Auto-fix and generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

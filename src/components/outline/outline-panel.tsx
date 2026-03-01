'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useOutlineStream } from '@/hooks/use-outline-stream'
import { saveOutline, updateOutlineChapter } from '@/actions/outline'
import { StreamingView } from '@/components/outline/streaming-view'
import { ChapterList } from '@/components/outline/chapter-list'
import { ChapterDetail } from '@/components/outline/chapter-detail'
import { OutlineTimeline } from '@/components/outline/outline-timeline'
import { BeatSheetOverlay } from '@/components/outline/beat-sheet-overlay'
import { RegenerateDialog } from '@/components/outline/regenerate-dialog'
import { ApproveDialog } from '@/components/outline/approve-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getBeatSheetById } from '@/lib/data/beat-sheets'
import type { OutlineRow, OutlineChapter, BeatSheetId } from '@/types/database'
import type { IntakeData } from '@/lib/validations/intake'
import type { GeneratedOutline } from '@/lib/outline/schema'
import { toast } from 'sonner'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface OutlinePanelProps {
  projectId: string
  projectTitle: string
  initialOutline: OutlineRow | null
  intakeData: IntakeData | null
}

export function OutlinePanel({
  projectId,
  projectTitle,
  initialOutline,
  intakeData,
}: OutlinePanelProps) {
  const router = useRouter()
  const [outline, setOutline] = useState<OutlineRow | null>(initialOutline)
  const [selectedChapterIndex, setSelectedChapterIndex] = useState(0)
  const [timelineCollapsed, setTimelineCollapsed] = useState(false)
  const [beatSheetId, setBeatSheetId] = useState<BeatSheetId>(
    initialOutline?.beat_sheet_id ?? (intakeData?.beatSheet as BeatSheetId | null) ?? 'three-act'
  )
  const [regenerateOpen, setRegenerateOpen] = useState(false)
  const [approveOpen, setApproveOpen] = useState(false)
  // Stores the full GeneratedOutline (with characters + locations) from the most
  // recent stream — required for outline approval so characters/locations are seeded.
  const [approveOutlineData, setApproveOutlineData] = useState<GeneratedOutline | null>(null)

  const { streamedContent, parsedOutline, isStreaming, error, startStream } =
    useOutlineStream(projectId)

  // When generation completes and parsedOutline is ready, save it
  const handleSaveOutline = useCallback(async () => {
    if (!parsedOutline || !intakeData) return
    const result = await saveOutline(projectId, parsedOutline, intakeData)
    if ('error' in result) {
      toast.error(`Failed to save outline: ${result.error}`)
      return
    }
    // Store the full generated outline for approval (has characters + locations)
    setApproveOutlineData(parsedOutline)
    // Update local state with saved data
    setOutline({
      id: result.outlineId,
      project_id: projectId,
      beat_sheet_id: (intakeData.beatSheet as BeatSheetId | null) ?? 'three-act',
      target_length: intakeData.targetLength,
      chapter_count: parsedOutline.chapters.length,
      chapters: parsedOutline.chapters,
      previous_chapters: null,
      status: 'draft',
      approved_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
  }, [parsedOutline, intakeData, projectId])

  // Watch for parsedOutline becoming available (stream complete) and save
  useState(() => {
    if (parsedOutline) {
      void handleSaveOutline()
    }
  })

  // Optimistic local state update for chapter edits — no revalidatePath per plan pitfall 6
  const handleChapterUpdate = useCallback(
    async (index: number, updates: Partial<OutlineChapter>) => {
      // Optimistic update
      setOutline((prev) => {
        if (!prev) return prev
        const updatedChapters = prev.chapters.map((ch, i) =>
          i === index ? { ...ch, ...updates } : ch
        )
        return { ...prev, chapters: updatedChapters }
      })

      // Persist to server
      const result = await updateOutlineChapter(projectId, index, updates)
      if ('error' in result) {
        toast.error(`Failed to save: ${result.error}`)
        // Revert on error by re-fetching would require a page reload;
        // for now just notify — data will be correct on next page load
      }
    },
    [projectId]
  )

  const handleRetryStream = useCallback(() => {
    if (intakeData) {
      void startStream(intakeData)
    }
  }, [intakeData, startStream])

  // Handle regeneration from RegenerateDialog
  const handleRegenerate = useCallback(
    (level: 'full' | 'directed' | 'chapter', direction?: string) => {
      if (!intakeData) {
        toast.error('Intake data not available for regeneration')
        return
      }
      if (level === 'full') {
        void startStream(intakeData)
      } else if (level === 'directed') {
        void startStream(intakeData, direction)
      } else if (level === 'chapter') {
        // Per-chapter regeneration: pass direction with chapter context
        const chapterHint = selectedChapterIndex !== undefined
          ? `[Regenerate chapter ${selectedChapterIndex + 1} only] ${direction ?? ''}`
          : direction
        void startStream(intakeData, chapterHint?.trim() || undefined)
      }
    },
    [intakeData, startStream, selectedChapterIndex]
  )

  // Navigate to story bible after outline approval
  const handleApproved = useCallback(() => {
    router.push(`/projects/${projectId}/story-bible`)
  }, [router, projectId])

  const beatSheet = getBeatSheetById(beatSheetId)

  // ── Streaming / generation mode ──────────────────────────────────────────
  if (!outline && intakeData) {
    if (!isStreaming && !streamedContent && !parsedOutline) {
      // Show prompt to start generation
      return (
        <div className="flex flex-col items-center justify-center min-h-[500px] gap-6 p-8">
          <div className="text-center space-y-2 max-w-md">
            <h2 className="text-xl font-semibold">Ready to Generate Your Outline</h2>
            <p className="text-muted-foreground text-sm">
              Your intake answers are saved. Click below to generate your story outline.
            </p>
          </div>
          <button
            onClick={() => void startStream(intakeData)}
            className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Generate Outline
          </button>
        </div>
      )
    }

    return (
      <StreamingView
        streamedContent={streamedContent}
        isStreaming={isStreaming}
        error={error}
        onRetry={handleRetryStream}
      />
    )
  }

  // ── No outline and no intake data ────────────────────────────────────────
  if (!outline) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] gap-4 p-8">
        <div className="text-center space-y-2">
          <h2 className="text-xl font-semibold">No Outline Yet</h2>
          <p className="text-muted-foreground text-sm">
            Complete the intake wizard to generate your outline.
          </p>
        </div>
        <a
          href={`/projects/${projectId}/intake`}
          className="text-sm text-primary underline-offset-4 hover:underline"
        >
          Go to Intake Wizard
        </a>
      </div>
    )
  }

  const selectedChapter = outline.chapters[selectedChapterIndex]

  // ── Two-panel outline viewer/editor ──────────────────────────────────────
  return (
    <div className="flex flex-col min-h-screen">
      {/* Top toolbar */}
      <div className="flex items-center justify-between gap-4 px-6 py-3 border-b bg-background">
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="text-lg font-semibold truncate">{projectTitle}</h1>
          {beatSheet && (
            <Badge variant="secondary" className="text-xs shrink-0">
              {beatSheet.name}
            </Badge>
          )}
          <Badge
            variant={outline.status === 'approved' ? 'default' : 'outline'}
            className="text-xs shrink-0"
          >
            {outline.status === 'approved' ? 'Approved' : 'Draft'}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          {outline.status !== 'approved' && intakeData && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRegenerateOpen(true)}
              disabled={isStreaming}
            >
              Regenerate
            </Button>
          )}
          {outline.status !== 'approved' && (
            <Button
              size="sm"
              onClick={() => setApproveOpen(true)}
              disabled={isStreaming || !approveOutlineData}
              title={!approveOutlineData ? 'Generate or regenerate the outline first to enable approval' : undefined}
            >
              Approve Outline
            </Button>
          )}
        </div>
      </div>

      {/* Two-panel layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel — Chapter list (~35%) */}
        <div className="w-[35%] border-r overflow-y-auto shrink-0">
          <ChapterList
            chapters={outline.chapters}
            selectedIndex={selectedChapterIndex}
            onSelect={setSelectedChapterIndex}
          />
        </div>

        {/* Right panel — Chapter detail (~65%) */}
        <div className="flex-1 overflow-y-auto">
          {selectedChapter ? (
            <ChapterDetail
              chapter={selectedChapter}
              chapterIndex={selectedChapterIndex}
              onUpdate={handleChapterUpdate}
            />
          ) : (
            <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
              Select a chapter to view details
            </div>
          )}
        </div>
      </div>

      {/* Below panels: beat sheet overlay and timeline (collapsible) */}
      <div className="border-t">
        {/* Beat sheet overlay */}
        <BeatSheetOverlay
          chapters={outline.chapters}
          beatSheetId={beatSheetId}
          onChangeBeatSheet={(id) => setBeatSheetId(id as BeatSheetId)}
        />

        {/* Timeline collapse toggle */}
        <div className="border-t">
          <button
            onClick={() => setTimelineCollapsed((c) => !c)}
            className="flex items-center gap-2 w-full px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            {timelineCollapsed ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronUp className="h-4 w-4" />
            )}
            {timelineCollapsed ? 'Show Timeline' : 'Hide Timeline'}
          </button>
          {!timelineCollapsed && (
            <OutlineTimeline
              chapters={outline.chapters}
              beatSheetId={beatSheetId}
              selectedIndex={selectedChapterIndex}
              onSelect={setSelectedChapterIndex}
            />
          )}
        </div>
      </div>

      {/* Regeneration dialog */}
      {intakeData && (
        <RegenerateDialog
          projectId={projectId}
          intakeData={intakeData}
          selectedChapterIndex={selectedChapterIndex}
          open={regenerateOpen}
          onOpenChange={setRegenerateOpen}
          onRegenerate={handleRegenerate}
        />
      )}

      {/* Approval dialog — only renders when we have the full GeneratedOutline from this session */}
      {outline.status !== 'approved' && approveOutlineData && (
        <ApproveDialog
          projectId={projectId}
          outlineId={outline.id}
          outlineData={approveOutlineData}
          open={approveOpen}
          onOpenChange={setApproveOpen}
          onApproved={handleApproved}
        />
      )}
    </div>
  )
}

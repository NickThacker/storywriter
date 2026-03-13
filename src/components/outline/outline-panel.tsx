'use client'

import { useState, useCallback, useEffect } from 'react'
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
import { BookOpen, Users, MapPin, ArrowRight } from 'lucide-react'

// ─── Review tab types ────────────────────────────────────────────────────────
type ReviewTab = 'chapters' | 'characters' | 'locations'

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
  // Review mode: show tabbed view after generation before the two-panel editor
  // Starts false when loading an existing outline, set to true after fresh generation
  const [reviewMode, setReviewMode] = useState(false)
  const [reviewTab, setReviewTab] = useState<ReviewTab>('chapters')
  const [beatSheetId, setBeatSheetId] = useState<BeatSheetId>(
    initialOutline?.beat_sheet_id ?? (intakeData?.beatSheet as BeatSheetId | null) ?? 'three-act'
  )
  const [regenerateOpen, setRegenerateOpen] = useState(false)
  const [approveOpen, setApproveOpen] = useState(false)
  // Stores the full GeneratedOutline (with characters + locations) from the most
  // recent stream — required for outline approval so characters/locations are seeded.
  // For pre-existing outlines, we reconstruct from stored data so approval isn't blocked.
  const [approveOutlineData, setApproveOutlineData] = useState<GeneratedOutline | null>(() => {
    if (initialOutline && initialOutline.status !== 'approved' && initialOutline.chapters?.length) {
      // Extract unique character names from chapters' characters_featured
      const charNames = new Set<string>()
      for (const ch of initialOutline.chapters) {
        if (ch.characters_featured) {
          for (const name of ch.characters_featured) charNames.add(name)
        }
      }
      return {
        title: projectTitle,
        premise: '',
        chapters: initialOutline.chapters,
        characters: Array.from(charNames).map(name => ({ name, role: 'supporting', one_line: '' })),
        locations: [],
      }
    }
    return null
  })

  const { streamedContent, parsedOutline, isStreaming, error, startStream } =
    useOutlineStream(projectId)

  // Auto-start generation when arriving with intake data but no existing outline
  const [autoStarted, setAutoStarted] = useState(false)
  useEffect(() => {
    if (!initialOutline && intakeData && !autoStarted) {
      setAutoStarted(true)
      void startStream(intakeData)
    }
  }, [initialOutline, intakeData, autoStarted, startStream])

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
    // Show the tabbed review view before the two-panel editor
    setReviewMode(true)
  }, [parsedOutline, intakeData, projectId])

  // Watch for parsedOutline becoming available (stream complete) and save
  useEffect(() => {
    if (parsedOutline) {
      void handleSaveOutline()
    }
  }, [parsedOutline, handleSaveOutline])

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

  // Navigate to chapters after outline approval
  const handleApproved = useCallback(() => {
    router.push(`/projects/${projectId}/chapters`)
  }, [router, projectId])

  // Timeline dot click — selects chapter, and in review mode also switches to chapters tab + scrolls
  const handleTimelineSelect = useCallback((index: number) => {
    setSelectedChapterIndex(index)
    if (reviewMode) {
      setReviewTab('chapters')
      setTimeout(() => {
        document.getElementById(`review-chapter-${index}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }, 50)
    }
  }, [reviewMode])

  const beatSheet = getBeatSheetById(beatSheetId)

  // ── Streaming / generation mode ──────────────────────────────────────────
  if (!outline && intakeData) {
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

  // ── Review mode — three-tab view after generation ─────────────────────────
  if (reviewMode && approveOutlineData) {
    const reviewTabs: { key: ReviewTab; label: string; icon: typeof BookOpen; count: number }[] = [
      { key: 'chapters', label: 'Chapters', icon: BookOpen, count: outline.chapters.length },
      { key: 'characters', label: 'Characters', icon: Users, count: approveOutlineData.characters?.length ?? 0 },
      { key: 'locations', label: 'Locations', icon: MapPin, count: approveOutlineData.locations?.length ?? 0 },
    ]

    const ACT_COLORS: Record<number, string> = {
      1: 'text-[color:var(--gold)] border-[color:var(--gold)]/20 bg-[color:var(--gold)]/5',
      2: 'text-rose-400 border-rose-400/20 bg-rose-400/5',
      3: 'text-teal-400 border-teal-400/20 bg-teal-400/5',
    }

    return (
      <div className="flex flex-col h-full min-h-screen">
        {/* Header */}
        <div className="px-6 py-4 border-b space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold tracking-tight">{outline.chapters.length > 0 ? projectTitle : 'Your Outline'}</h2>
              {approveOutlineData.premise && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{approveOutlineData.premise}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {intakeData && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRegenerateOpen(true)}
                >
                  Regenerate
                </Button>
              )}
              <Button
                size="sm"
                onClick={() => setReviewMode(false)}
              >
                Continue to Editor
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Timeline — always visible at top */}
        <div className="border-b bg-muted/30">
          <OutlineTimeline
            chapters={outline.chapters}
            beatSheetId={beatSheetId}
            selectedIndex={selectedChapterIndex}
            onSelect={handleTimelineSelect}
          />
        </div>

        {/* Tabs */}
        <div className="flex border-b px-6">
          {reviewTabs.map(({ key, label, icon: Icon, count }) => {
            const isActive = reviewTab === key
            return (
              <button
                key={key}
                type="button"
                onClick={() => setReviewTab(key)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                  isActive
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{label}</span>
                {count > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    isActive ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-6 py-8">
            {reviewTab === 'chapters' && (
              <div className="space-y-2">
                {outline.chapters.map((ch, i) => {
                  const actColor = ACT_COLORS[ch.act ?? 1] ?? ACT_COLORS[1]
                  const isHighlighted = i === selectedChapterIndex
                  return (
                    <div
                      key={ch.number ?? i}
                      id={`review-chapter-${i}`}
                      className={`rounded-lg border bg-card transition-colors ${
                        isHighlighted ? 'ring-1 ring-[color:var(--gold)]/40' : ''
                      }`}
                    >
                      {ch.beat_sheet_mapping && (
                        <div className={`px-4 py-1.5 text-[11px] font-medium rounded-t-lg border-b ${actColor}`}>
                          {ch.beat_sheet_mapping}
                        </div>
                      )}
                      <div className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-mono text-muted-foreground shrink-0 w-6 text-right">
                            {ch.number ?? i + 1}
                          </span>
                          <span className="font-semibold text-sm text-foreground flex-1">{ch.title}</span>
                          {ch.act && (
                            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${actColor}`}>
                              Act {ch.act}
                            </Badge>
                          )}
                        </div>
                        {ch.summary && (
                          <p className="text-sm text-muted-foreground leading-relaxed mt-2 pl-9">{ch.summary}</p>
                        )}
                        {ch.beats && ch.beats.length > 0 && (
                          <ul className="mt-2 pl-9 space-y-0.5">
                            {ch.beats.map((beat, bi) => (
                              <li key={bi} className="flex items-start gap-2 text-xs text-muted-foreground">
                                <span className="text-primary/60 mt-px shrink-0">-</span>
                                <span>{beat}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                        {ch.characters_featured && ch.characters_featured.length > 0 && (
                          <div className="flex items-center gap-1.5 mt-2 pl-9 flex-wrap">
                            <Users className="h-3 w-3 text-muted-foreground/60" />
                            {ch.characters_featured.map((name, ci) => (
                              <span key={ci} className="text-[11px] text-muted-foreground">
                                {name}{ci < ch.characters_featured!.length - 1 ? ',' : ''}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {reviewTab === 'characters' && (
              <div className="space-y-2">
                {(approveOutlineData.characters ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No characters found</p>
                ) : (
                  (approveOutlineData.characters ?? []).map((ch, i) => (
                    <div key={i} className="rounded-lg border bg-card p-4 pb-5 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{ch.name}</span>
                        {ch.role && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize">
                            {ch.role}
                          </Badge>
                        )}
                      </div>
                      {ch.one_line && (
                        <p className="text-sm text-muted-foreground">{ch.one_line}</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {reviewTab === 'locations' && (
              <div className="space-y-2">
                {(approveOutlineData.locations ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No locations found</p>
                ) : (
                  (approveOutlineData.locations ?? []).map((loc, i) => (
                    <div key={i} className="rounded-lg border bg-card p-4 pb-5 space-y-1">
                      <span className="font-semibold text-sm">{loc.name}</span>
                      {loc.description && (
                        <p className="text-sm text-muted-foreground">{loc.description}</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Bottom bar with beat sheet mapping */}
        <div className="border-t">
          <BeatSheetOverlay
            chapters={outline.chapters}
            beatSheetId={beatSheetId}
            onChangeBeatSheet={(id) => setBeatSheetId(id as BeatSheetId)}
          />
        </div>

        {/* Regeneration dialog */}
        {intakeData && (
          <RegenerateDialog
            projectId={projectId}
            intakeData={intakeData}
            selectedChapterIndex={0}
            open={regenerateOpen}
            onOpenChange={setRegenerateOpen}
            onRegenerate={handleRegenerate}
          />
        )}
      </div>
    )
  }

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

      {/* Timeline — always visible at top */}
      <div className="border-b bg-muted/30">
        <OutlineTimeline
          chapters={outline.chapters}
          beatSheetId={beatSheetId}
          selectedIndex={selectedChapterIndex}
          onSelect={setSelectedChapterIndex}
        />
      </div>

      {/* Two-panel layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel — Chapter list (~35%) */}
        <div className="w-[35%] border-r overflow-y-auto shrink-0">
          <ChapterList
            chapters={outline.chapters}
            selectedIndex={selectedChapterIndex}
            onSelect={setSelectedChapterIndex}
            projectId={projectId}
          />
        </div>

        {/* Right panel — Chapter detail (~65%) */}
        <div className="flex-1 overflow-y-auto">
          {selectedChapter ? (
            <ChapterDetail
              chapter={selectedChapter}
              chapterIndex={selectedChapterIndex}
              onUpdate={handleChapterUpdate}
              projectId={projectId}
            />
          ) : (
            <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
              Select a chapter to view details
            </div>
          )}
        </div>
      </div>

      {/* Beat sheet overlay */}
      <div className="border-t">
        <BeatSheetOverlay
          chapters={outline.chapters}
          beatSheetId={beatSheetId}
          onChangeBeatSheet={(id) => setBeatSheetId(id as BeatSheetId)}
        />
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

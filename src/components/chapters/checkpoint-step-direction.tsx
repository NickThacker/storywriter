'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, ChevronDown, ChevronUp, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DirectionOptionCard } from './direction-option-card'
import { saveDirection } from '@/actions/chapters'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { ChapterCheckpointRow, DirectionOption, SelectedDirection } from '@/types/project-memory'

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

interface AffectedChapterResult {
  chapterNumber: number
  description: string
  affectsPlotThreads: string[]
}

interface CheckpointStepDirectionProps {
  projectId: string
  chapterNumber: number
  checkpoint: ChapterCheckpointRow
  nextChapterTitle: string
  onDirectionSaved: (chapterNumber: number, directionForNext: string) => void
  onBack?: () => void
}

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

/** Assemble the direction_for_next prompt string from a selected option. */
function buildDirectionForNextFromOption(option: DirectionOption): string {
  return `Direction: ${option.title}\n\n${option.body}`
}

/** Assemble the direction_for_next prompt string from custom fields. */
function buildDirectionForNextFromCustom(
  tone: string,
  pacing: string,
  characterFocus: string,
  freeText: string
): string {
  const parts: string[] = []
  if (tone.trim()) parts.push(`Tone: ${tone.trim()}`)
  if (pacing.trim()) parts.push(`Pacing: ${pacing.trim()}`)
  if (characterFocus.trim()) parts.push(`Character Focus: ${characterFocus.trim()}`)
  if (freeText.trim()) parts.push(`Additional Notes: ${freeText.trim()}`)
  return parts.join('\n')
}

// ──────────────────────────────────────────────────────────────────────────────
// CheckpointStepDirection — Step 2: direction cards + custom direction form
// ──────────────────────────────────────────────────────────────────────────────

export function CheckpointStepDirection({
  projectId,
  chapterNumber,
  checkpoint,
  nextChapterTitle,
  onDirectionSaved,
  onBack,
}: CheckpointStepDirectionProps) {
  // ── Options loading state
  const [options, setOptions] = useState<DirectionOption[]>(
    checkpoint.direction_options ?? []
  )
  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  // ── Selection mode: 'option' (card) or 'custom'
  const [selectionMode, setSelectionMode] = useState<'option' | 'custom'>(
    checkpoint.selected_direction?.type === 'custom' ? 'custom' : 'option'
  )

  // ── Selected option ID (if mode === 'option')
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(
    checkpoint.selected_direction?.type === 'option'
      ? (checkpoint.selected_direction.optionId ?? null)
      : null
  )

  // ── Custom fields (if mode === 'custom')
  const [tone, setTone] = useState(
    checkpoint.selected_direction?.type === 'custom'
      ? (checkpoint.selected_direction.tone ?? '')
      : ''
  )
  const [pacing, setPacing] = useState(
    checkpoint.selected_direction?.type === 'custom'
      ? (checkpoint.selected_direction.pacing ?? '')
      : ''
  )
  const [characterFocus, setCharacterFocus] = useState(
    checkpoint.selected_direction?.type === 'custom'
      ? (checkpoint.selected_direction.characterFocus ?? '')
      : ''
  )

  // ── Advanced toggle + free text
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [freeText, setFreeText] = useState(
    checkpoint.selected_direction?.freeText ?? ''
  )

  // ── Saving state
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // ── Impact analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [impactResults, setImpactResults] = useState<AffectedChapterResult[] | null>(null)

  // ── Whether direction was already confirmed
  const alreadySaved = !!checkpoint.selected_direction

  // ── Fetch options from API if not cached
  useEffect(() => {
    if (options.length > 0) return // Cached — skip API call (Pitfall 2)

    setIsLoading(true)
    setLoadError(null)

    fetch('/api/generate/direction-options', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, chapterNumber }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const json = await res.json().catch(() => ({ error: 'Unknown error' }))
          throw new Error((json as { error?: string }).error ?? `HTTP ${res.status}`)
        }
        return res.json() as Promise<{ success: true; options: DirectionOption[] }>
      })
      .then((data) => {
        setOptions(data.options)
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Failed to load direction options'
        setLoadError(msg)
      })
      .finally(() => {
        setIsLoading(false)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, chapterNumber])

  // ── Can confirm?
  const canConfirm = useCallback(() => {
    if (selectionMode === 'option') {
      return selectedOptionId !== null
    }
    // custom mode: at least one field must be filled
    return (
      tone.trim().length > 0 ||
      pacing.trim().length > 0 ||
      characterFocus.trim().length > 0 ||
      freeText.trim().length > 0
    )
  }, [selectionMode, selectedOptionId, tone, pacing, characterFocus, freeText])

  // ── Assemble the current direction string (for impact analysis)
  function getAssembledDirection(): string {
    if (selectionMode === 'option' && selectedOptionId) {
      const option = options.find((o) => o.id === selectedOptionId)
      if (option) return buildDirectionForNextFromOption(option)
    }
    return buildDirectionForNextFromCustom(tone, pacing, characterFocus, freeText)
  }

  // ── Handle impact analysis (on-demand — user clicks "Analyze Impact")
  async function handleAnalyzeImpact() {
    const assembledDirection = getAssembledDirection()
    if (!assembledDirection.trim()) {
      toast.error('Select or enter a direction before analyzing impact')
      return
    }

    setIsAnalyzing(true)
    setImpactResults(null)

    try {
      const response = await fetch('/api/generate/analyze-impact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          chapterNumber,
          newDirection: assembledDirection,
        }),
      })
      const result = (await response.json()) as
        | { success: true; affectedChapters: AffectedChapterResult[] }
        | { error: string }

      if ('success' in result && result.success) {
        setImpactResults(result.affectedChapters)
        if (result.affectedChapters.length === 0) {
          toast.success('No downstream chapters are concretely affected by this direction change.')
        }
      } else {
        const errMsg = 'error' in result ? result.error : 'Impact analysis failed'
        toast.error(errMsg)
      }
    } catch {
      toast.error('Failed to analyze impact')
    } finally {
      setIsAnalyzing(false)
    }
  }

  // ── Handle confirm direction
  async function handleConfirm() {
    if (!canConfirm()) return
    setSaveError(null)
    setIsSaving(true)

    let selectedDirection: SelectedDirection
    let directionForNext: string

    if (selectionMode === 'option' && selectedOptionId) {
      const option = options.find((o) => o.id === selectedOptionId)
      if (!option) {
        setSaveError('Selected option not found. Please choose again.')
        setIsSaving(false)
        return
      }
      selectedDirection = { type: 'option', optionId: selectedOptionId }
      directionForNext = buildDirectionForNextFromOption(option)
    } else {
      selectedDirection = {
        type: 'custom',
        tone: tone.trim() || undefined,
        pacing: pacing.trim() || undefined,
        characterFocus: characterFocus.trim() || undefined,
        freeText: freeText.trim() || undefined,
      }
      directionForNext = buildDirectionForNextFromCustom(tone, pacing, characterFocus, freeText)
    }

    const result = await saveDirection(projectId, chapterNumber, selectedDirection, directionForNext)

    if ('error' in result) {
      setSaveError(result.error)
      setIsSaving(false)
      return
    }

    setIsSaving(false)
    onDirectionSaved(chapterNumber, directionForNext)
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────────────────────────

  return (
    <div className="p-5 space-y-5">
      {/* Section header */}
      <div>
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-0.5">
          Direction for Next Chapter
        </h4>
        <p className="text-xs text-muted-foreground">
          Chapter {chapterNumber + 1}: {nextChapterTitle}
        </p>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Generating direction options...</span>
        </div>
      )}

      {/* Error state */}
      {loadError && !isLoading && (
        <div className="rounded-md bg-destructive/10 px-3 py-3">
          <p className="text-xs text-destructive font-medium">Failed to load options</p>
          <p className="text-xs text-destructive/80 mt-0.5">{loadError}</p>
          <button
            type="button"
            className="mt-2 text-xs text-destructive underline underline-offset-2 hover:no-underline"
            onClick={() => {
              setLoadError(null)
              setOptions([])
            }}
          >
            Try again
          </button>
        </div>
      )}

      {/* Direction content (options + custom) */}
      {!isLoading && !loadError && (
        <>
          {/* Mode toggle: Option cards vs Custom */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setSelectionMode('option')}
              className={cn(
                'rounded-md px-3 py-1 text-xs font-medium transition-colors border',
                selectionMode === 'option'
                  ? 'border-primary/60 bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              AI Suggestions
            </button>
            <button
              type="button"
              onClick={() => setSelectionMode('custom')}
              className={cn(
                'rounded-md px-3 py-1 text-xs font-medium transition-colors border',
                selectionMode === 'custom'
                  ? 'border-primary/60 bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              Custom
            </button>
          </div>

          {/* AI suggestion cards */}
          {selectionMode === 'option' && (
            <div className="space-y-2">
              {options.length > 0 ? (
                options.map((option) => (
                  <DirectionOptionCard
                    key={option.id}
                    option={option}
                    isSelected={selectedOptionId === option.id}
                    onSelect={setSelectedOptionId}
                  />
                ))
              ) : (
                // Options not yet available (e.g., error retry cleared them)
                <p className="text-xs text-muted-foreground text-center py-4">
                  No options available. Switch to Custom or reload.
                </p>
              )}
            </div>
          )}

          {/* Custom direction form */}
          {selectionMode === 'custom' && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Tone
                </label>
                <input
                  type="text"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  placeholder="e.g., darker, hopeful, tense, intimate"
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Pacing
                </label>
                <input
                  type="text"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  placeholder="e.g., fast action, slow introspection, steady buildup"
                  value={pacing}
                  onChange={(e) => setPacing(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Character Focus
                </label>
                <input
                  type="text"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  placeholder="e.g., lean into the antagonist's perspective"
                  value={characterFocus}
                  onChange={(e) => setCharacterFocus(e.target.value)}
                />
              </div>

              {/* Advanced toggle */}
              <button
                type="button"
                onClick={() => setShowAdvanced((v) => !v)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {showAdvanced ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
                Advanced (free text)
              </button>

              {showAdvanced && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    Additional Notes
                  </label>
                  <textarea
                    className="flex min-h-[90px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                    placeholder="Any additional direction not covered by the fields above..."
                    value={freeText}
                    onChange={(e) => setFreeText(e.target.value)}
                  />
                </div>
              )}
            </div>
          )}

          {/* Already-saved banner */}
          {alreadySaved && (
            <div className="rounded-md bg-muted px-3 py-2">
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Direction saved.</span> You can change your selection and confirm again.
              </p>
            </div>
          )}

          {/* Analyze Impact button — shown when changing a previously-saved direction */}
          {alreadySaved && (
            <div className="space-y-3">
              <Button
                variant="outline"
                onClick={handleAnalyzeImpact}
                disabled={isAnalyzing || !canConfirm()}
                className="w-full text-amber-700 border-amber-300 hover:bg-amber-50 hover:text-amber-800 dark:text-amber-400 dark:border-amber-500/40 dark:hover:bg-amber-500/10"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing impact...
                  </>
                ) : (
                  <>
                    <Zap className="mr-2 h-4 w-4" />
                    Analyze Impact
                  </>
                )}
              </Button>

              {/* Impact results */}
              {impactResults !== null && (
                <div className="space-y-2">
                  {impactResults.length > 0 ? (
                    <>
                      <h4 className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                        Affected Chapters
                      </h4>
                      {impactResults.map((r) => (
                        <div
                          key={r.chapterNumber}
                          className="rounded-md bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/20 px-3 py-2"
                        >
                          <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                            Chapter {r.chapterNumber}
                          </p>
                          <p className="text-xs text-amber-600 dark:text-amber-500 mt-0.5">
                            {r.description}
                          </p>
                          {r.affectsPlotThreads.length > 0 && (
                            <p className="text-xs text-amber-500/80 dark:text-amber-500/60 mt-1">
                              Threads: {r.affectsPlotThreads.join(', ')}
                            </p>
                          )}
                        </div>
                      ))}
                    </>
                  ) : (
                    <div className="rounded-md bg-muted px-3 py-2">
                      <p className="text-xs text-muted-foreground">
                        No downstream chapters are concretely affected by this direction change.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Save error */}
          {saveError && (
            <p className="text-xs text-destructive">{saveError}</p>
          )}

          {/* Action buttons */}
          <div className="space-y-2 pt-1">
            <Button
              onClick={handleConfirm}
              disabled={!canConfirm() || isSaving}
              className="w-full"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : alreadySaved ? (
                'Update Direction'
              ) : (
                'Confirm Direction'
              )}
            </Button>

            {onBack && (
              <Button
                variant="ghost"
                onClick={onBack}
                className="w-full text-muted-foreground"
              >
                Back to Review
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  )
}

'use client'

import { BEAT_SHEETS, getBeatSheetById } from '@/lib/data/beat-sheets'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { OutlineChapter } from '@/types/database'

interface BeatSheetOverlayProps {
  chapters: OutlineChapter[]
  beatSheetId: string
  onChangeBeatSheet: (id: string) => void
}

/**
 * Shows how the current outline maps to the selected beat sheet structure.
 * Beat sheet is switchable for comparison — does NOT regenerate the outline.
 */
export function BeatSheetOverlay({
  chapters,
  beatSheetId,
  onChangeBeatSheet,
}: BeatSheetOverlayProps) {
  const beatSheet = getBeatSheetById(beatSheetId)

  // Build a map from beat_sheet_mapping value to chapters
  const beatToChapters: Map<string, OutlineChapter[]> = new Map()
  chapters.forEach((chapter) => {
    if (chapter.beat_sheet_mapping) {
      const key = chapter.beat_sheet_mapping.toLowerCase()
      if (!beatToChapters.has(key)) {
        beatToChapters.set(key, [])
      }
      beatToChapters.get(key)!.push(chapter)
    }
  })

  // Check if a beat has matching chapters (fuzzy match on beat name)
  function getMatchingChapters(beatName: string): OutlineChapter[] {
    const normalizedBeat = beatName.toLowerCase()
    // Check for direct key match
    if (beatToChapters.has(normalizedBeat)) {
      return beatToChapters.get(normalizedBeat) ?? []
    }
    // Fuzzy: check if any chapter's beat_sheet_mapping contains the beat name or vice versa
    const matches: OutlineChapter[] = []
    for (const [key, chaps] of beatToChapters.entries()) {
      if (key.includes(normalizedBeat) || normalizedBeat.includes(key)) {
        matches.push(...chaps)
      }
    }
    return matches
  }

  return (
    <div className="px-6 py-4 space-y-4">
      {/* Header with beat sheet selector */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold">Beat Sheet Mapping</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Comparing outline against{' '}
            <span className="font-medium">{beatSheet?.name ?? beatSheetId}</span>
            {' '}— switching beat sheets here is for comparison only
          </p>
        </div>
        <div className="w-52 shrink-0">
          <Select value={beatSheetId} onValueChange={onChangeBeatSheet}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Select beat sheet" />
            </SelectTrigger>
            <SelectContent>
              {BEAT_SHEETS.map((sheet) => (
                <SelectItem key={sheet.id} value={sheet.id} className="text-xs">
                  {sheet.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Beat list */}
      {beatSheet ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {beatSheet.beats.map((beat) => {
            const matchingChapters = getMatchingChapters(beat.name)
            const hasMapping = matchingChapters.length > 0

            return (
              <div
                key={beat.id}
                className={`rounded-md border p-3 text-xs transition-colors ${
                  hasMapping
                    ? 'border-border bg-background'
                    : 'border-dashed border-muted-foreground/30 bg-muted/30'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className={`font-semibold leading-snug ${hasMapping ? '' : 'text-muted-foreground'}`}>
                    {beat.name}
                  </span>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    Act {beat.act} · {beat.positionPercent}%
                  </span>
                </div>
                <p className={`text-[11px] leading-relaxed ${hasMapping ? 'text-muted-foreground' : 'text-muted-foreground/60'}`}>
                  {beat.description}
                </p>
                {hasMapping && (
                  <div className="mt-2 pt-2 border-t border-border/50 space-y-0.5">
                    {matchingChapters.map((ch) => (
                      <div key={ch.number} className="text-[11px] font-medium text-foreground">
                        Ch. {ch.number}: {ch.title}
                      </div>
                    ))}
                  </div>
                )}
                {!hasMapping && (
                  <div className="mt-2 text-[11px] text-muted-foreground/50 italic">
                    No chapter mapped
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Beat sheet not found.</p>
      )}
    </div>
  )
}

'use client'

import { useMemo } from 'react'
import { BEAT_SHEETS, getBeatSheetById } from '@/lib/data/beat-sheets'
import type { Beat } from '@/lib/data/beat-sheets'
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
 * Assign each chapter to the beat whose positionPercent is closest
 * to the chapter's position in the story. Used when viewing a beat sheet
 * different from the one used during generation.
 */
function buildPositionMapping(
  chapters: OutlineChapter[],
  beats: Beat[]
): Map<string, OutlineChapter[]> {
  const result = new Map<string, OutlineChapter[]>()
  for (const beat of beats) result.set(beat.id, [])

  for (let i = 0; i < chapters.length; i++) {
    const chapterPos = chapters.length <= 1 ? 50 : (i / (chapters.length - 1)) * 100
    let closestBeat = beats[0]
    let closestDist = Infinity
    for (const beat of beats) {
      const dist = Math.abs(beat.positionPercent - chapterPos)
      if (dist < closestDist) {
        closestDist = dist
        closestBeat = beat
      }
    }
    result.get(closestBeat.id)!.push(chapters[i])
  }

  return result
}

/**
 * Shows how the current outline maps to the selected beat sheet structure.
 * Beat sheet is switchable for comparison — does NOT regenerate the outline.
 *
 * When viewing the beat sheet used for generation, name-based fuzzy matching
 * connects chapters to beats via their beat_sheet_mapping field. When viewing
 * a different beat sheet, position-based mapping assigns chapters to the
 * nearest beat by story position.
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

  // Check if a beat has matching chapters (multi-level fuzzy match on beat name)
  function getNameMatchedChapters(beatName: string): OutlineChapter[] {
    const normalizedBeat = beatName.toLowerCase()
    // 1. Exact match
    if (beatToChapters.has(normalizedBeat)) {
      return beatToChapters.get(normalizedBeat) ?? []
    }
    // 2. Substring match — beat name is contained in mapping or vice versa
    const matches: OutlineChapter[] = []
    for (const [key, chaps] of beatToChapters.entries()) {
      if (key.includes(normalizedBeat) || normalizedBeat.includes(key)) {
        matches.push(...chaps)
      }
    }
    if (matches.length > 0) return matches
    // 3. Word-overlap match — check if significant words overlap
    const beatWords = normalizedBeat.split(/[\s/,·\-—]+/).filter((w) => w.length > 2)
    for (const [key, chaps] of beatToChapters.entries()) {
      const keyWords = key.split(/[\s/,·\-—]+/).filter((w) => w.length > 2)
      const overlap = beatWords.filter((bw) =>
        keyWords.some((kw) => kw.includes(bw) || bw.includes(kw))
      )
      if (overlap.length > 0) {
        matches.push(...chaps)
      }
    }
    return matches
  }

  // Determine whether name-based matching covers enough chapters.
  // If not, fall back to position-based mapping (viewing a different beat sheet).
  const { usePositionMapping, positionMap } = useMemo(() => {
    if (!beatSheet) return { usePositionMapping: false, positionMap: new Map<string, OutlineChapter[]>() }

    const nameMatched = new Set<number>()
    for (const beat of beatSheet.beats) {
      for (const ch of getNameMatchedChapters(beat.name)) {
        nameMatched.add(ch.number)
      }
    }
    const shouldUsePosition = nameMatched.size < chapters.length / 2
    const pMap = shouldUsePosition
      ? buildPositionMapping(chapters, beatSheet.beats)
      : new Map<string, OutlineChapter[]>()
    return { usePositionMapping: shouldUsePosition, positionMap: pMap }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beatSheetId, chapters])

  function getMatchingChapters(beat: Beat): OutlineChapter[] {
    if (usePositionMapping) {
      return positionMap.get(beat.id) ?? []
    }
    return getNameMatchedChapters(beat.name)
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
            const matchingChapters = getMatchingChapters(beat)
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

'use client'

import { getBeatSheetById } from '@/lib/data/beat-sheets'
import type { OutlineChapter } from '@/types/database'

interface OutlineTimelineProps {
  chapters: OutlineChapter[]
  beatSheetId: string
  selectedIndex: number
  onSelect: (index: number) => void
}

// Act node colors
const ACT_NODE_COLORS: Record<number, { bg: string; border: string; selectedBg: string }> = {
  1: { bg: 'bg-blue-100', border: 'border-blue-300', selectedBg: 'bg-blue-500' },
  2: { bg: 'bg-amber-100', border: 'border-amber-300', selectedBg: 'bg-amber-500' },
  3: { bg: 'bg-green-100', border: 'border-green-300', selectedBg: 'bg-green-500' },
}

export function OutlineTimeline({
  chapters,
  beatSheetId,
  selectedIndex,
  onSelect,
}: OutlineTimelineProps) {
  const beatSheet = getBeatSheetById(beatSheetId)
  const totalChapters = chapters.length

  // Position each chapter as a percentage along the timeline
  function getChapterPosition(index: number): number {
    if (totalChapters <= 1) return 50
    return (index / (totalChapters - 1)) * 100
  }

  return (
    <div className="px-6 py-4 overflow-x-auto">
      <div className="min-w-[600px]">
        {/* Beat labels above the timeline */}
        {beatSheet && (
          <div className="relative h-8 mb-1">
            {beatSheet.beats.map((beat) => (
              <div
                key={beat.id}
                className="absolute transform -translate-x-1/2 flex flex-col items-center"
                style={{ left: `${beat.positionPercent}%` }}
              >
                <span className="text-[10px] text-muted-foreground whitespace-nowrap leading-none">
                  {beat.name}
                </span>
                {/* Tick mark */}
                <span className="w-px h-2 bg-muted-foreground/30 mt-0.5" />
              </div>
            ))}
          </div>
        )}

        {/* Timeline track */}
        <div className="relative h-12 flex items-center">
          {/* Horizontal line */}
          <div className="absolute inset-x-0 h-px bg-border top-1/2 -translate-y-1/2" />

          {/* Chapter nodes */}
          {chapters.map((chapter, index) => {
            const position = getChapterPosition(index)
            const actColors = ACT_NODE_COLORS[chapter.act] ?? ACT_NODE_COLORS[1]
            const isSelected = index === selectedIndex

            return (
              <button
                key={index}
                onClick={() => onSelect(index)}
                className={`absolute transform -translate-x-1/2 -translate-y-1/2 top-1/2 flex flex-col items-center gap-1 group focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full`}
                style={{ left: `${position}%` }}
                title={`Ch. ${chapter.number}: ${chapter.title}`}
              >
                <div
                  className={`
                    h-4 w-4 rounded-full border-2 transition-all
                    ${isSelected
                      ? `${actColors.selectedBg} border-transparent scale-125 shadow-md`
                      : `${actColors.bg} ${actColors.border} hover:scale-110`
                    }
                  `}
                />
              </button>
            )
          })}
        </div>

        {/* Chapter numbers below the timeline */}
        <div className="relative h-6 mt-1">
          {chapters.map((chapter, index) => {
            const position = getChapterPosition(index)
            const isSelected = index === selectedIndex

            return (
              <button
                key={index}
                onClick={() => onSelect(index)}
                className={`absolute transform -translate-x-1/2 text-[10px] transition-colors hover:text-foreground focus:outline-none ${
                  isSelected ? 'text-foreground font-semibold' : 'text-muted-foreground'
                }`}
                style={{ left: `${position}%` }}
                title={`Ch. ${chapter.number}: ${chapter.title}`}
              >
                {chapter.number}
              </button>
            )
          })}
        </div>

        {/* Act legend */}
        <div className="flex items-center gap-4 mt-3 justify-end">
          {[1, 2, 3].map((act) => {
            const colors = ACT_NODE_COLORS[act]
            const hasChapters = chapters.some((c) => c.act === act)
            if (!hasChapters) return null
            return (
              <div key={act} className="flex items-center gap-1.5">
                <div className={`h-2.5 w-2.5 rounded-full ${colors.bg} border ${colors.border}`} />
                <span className="text-xs text-muted-foreground">Act {act}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

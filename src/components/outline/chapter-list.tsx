'use client'

import { Badge } from '@/components/ui/badge'
import type { OutlineChapter } from '@/types/database'

interface ChapterListProps {
  chapters: OutlineChapter[]
  selectedIndex: number
  onSelect: (index: number) => void
}

// Act colors for badges
const ACT_COLORS: Record<number, string> = {
  1: 'bg-blue-100 text-blue-800 border-blue-200',
  2: 'bg-amber-100 text-amber-800 border-amber-200',
  3: 'bg-green-100 text-green-800 border-green-200',
}

function ActDivider({ act }: { act: number }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 sticky top-0 bg-background/95 backdrop-blur-sm z-10 border-b">
      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${ACT_COLORS[act] ?? 'bg-muted text-muted-foreground'}`}>
        Act {act}
      </span>
    </div>
  )
}

export function ChapterList({ chapters, selectedIndex, onSelect }: ChapterListProps) {
  // Group chapters by act
  const actGroups: Map<number, { chapter: OutlineChapter; index: number }[]> = new Map()

  chapters.forEach((chapter, index) => {
    const act = chapter.act ?? 1
    if (!actGroups.has(act)) {
      actGroups.set(act, [])
    }
    actGroups.get(act)!.push({ chapter, index })
  })

  const sortedActs = Array.from(actGroups.keys()).sort((a, b) => a - b)

  return (
    <div className="overflow-y-auto h-full">
      {sortedActs.map((act) => (
        <div key={act}>
          <ActDivider act={act} />
          <ul className="py-1">
            {(actGroups.get(act) ?? []).map(({ chapter, index }) => {
              const isSelected = index === selectedIndex
              return (
                <li key={index}>
                  <button
                    onClick={() => onSelect(index)}
                    className={`w-full text-left px-4 py-3 transition-colors hover:bg-accent/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset ${
                      isSelected ? 'bg-accent' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className="text-xs font-medium text-muted-foreground shrink-0">
                        Ch. {chapter.number}
                      </span>
                      {chapter.beat_sheet_mapping && (
                        <span className="text-xs text-muted-foreground truncate text-right">
                          {chapter.beat_sheet_mapping}
                        </span>
                      )}
                    </div>
                    <p className={`text-sm font-medium leading-snug ${isSelected ? 'text-accent-foreground' : ''}`}>
                      {chapter.title}
                    </p>
                    {chapter.summary && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                        {chapter.summary}
                      </p>
                    )}
                    {chapter.characters_featured && chapter.characters_featured.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {chapter.characters_featured.slice(0, 3).map((name) => (
                          <Badge key={name} variant="outline" className="text-[10px] px-1 py-0 h-4">
                            {name}
                          </Badge>
                        ))}
                        {chapter.characters_featured.length > 3 && (
                          <span className="text-[10px] text-muted-foreground self-center">
                            +{chapter.characters_featured.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </div>
  )
}

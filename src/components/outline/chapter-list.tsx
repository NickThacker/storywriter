'use client'

import Link from 'next/link'
import type { OutlineChapter } from '@/types/database'

interface ChapterListProps {
  chapters: OutlineChapter[]
  selectedIndex: number
  onSelect: (index: number) => void
  projectId: string
}

const ACT_TEXT: Record<number, string> = {
  1: 'text-[color:var(--gold)]',
  2: 'text-rose-400',
  3: 'text-teal-400',
}

function ActDivider({ act }: { act: number }) {
  const color = ACT_TEXT[act] ?? 'text-muted-foreground'
  return (
    <div className="flex items-center gap-2 px-4 py-2 sticky top-0 bg-background/95 backdrop-blur-sm z-10 border-b">
      <span className={`text-[0.65rem] font-medium uppercase tracking-[0.1em] ${color}`}>
        Act {act}
      </span>
    </div>
  )
}

export function ChapterList({ chapters, selectedIndex, onSelect, projectId }: ChapterListProps) {
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
                    className={`w-full text-left px-4 pt-3 pb-4 transition-colors hover:bg-accent/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset ${
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
                      <div className="flex flex-wrap gap-1 mt-1.5" onClick={(e) => e.stopPropagation()}>
                        {chapter.characters_featured.slice(0, 3).map((name) => (
                          <Link
                            key={name}
                            href={`/projects/${projectId}/story-bible`}
                            className="text-[10px] px-1.5 py-0.5 border border-border rounded text-muted-foreground hover:text-[color:var(--gold)] hover:border-[color:var(--gold)]/40 transition-colors"
                          >
                            {name}
                          </Link>
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

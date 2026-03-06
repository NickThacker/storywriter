'use client'

import { useCallback, useEffect } from 'react'
import Link from 'next/link'
import { useDebouncedCallback } from 'use-debounce'
import { Badge } from '@/components/ui/badge'
import { InlineEditable } from '@/components/outline/inline-editable'
import type { OutlineChapter } from '@/types/database'

interface ChapterDetailProps {
  chapter: OutlineChapter
  chapterIndex: number
  onUpdate: (index: number, updates: Partial<OutlineChapter>) => void
  projectId: string
}

const ACT_COLORS: Record<number, string> = {
  1: 'text-[color:var(--gold)] border-[color:var(--gold)]/30 bg-[color:var(--gold)]/5',
  2: 'text-rose-400 border-rose-400/30 bg-rose-400/5',
  3: 'text-teal-400 border-teal-400/30 bg-teal-400/5',
}

export function ChapterDetail({ chapter, chapterIndex, onUpdate, projectId }: ChapterDetailProps) {
  // Debounced save — consistent with PROJ-05 pattern (600ms)
  const debouncedUpdate = useDebouncedCallback(
    useCallback(
      (updates: Partial<OutlineChapter>) => {
        onUpdate(chapterIndex, updates)
      },
      [chapterIndex, onUpdate]
    ),
    600
  )

  // Flush pending debounced saves on unmount (e.g. when navigating away)
  useEffect(() => {
    return () => {
      debouncedUpdate.flush()
    }
  }, [debouncedUpdate])

  function handleTitleSave(title: string) {
    debouncedUpdate({ title })
  }

  function handleSummarySave(summary: string) {
    debouncedUpdate({ summary })
  }

  function handleBeatSave(beatIndex: number, value: string) {
    const updatedBeats = chapter.beats.map((b, i) => (i === beatIndex ? value : b))
    debouncedUpdate({ beats: updatedBeats })
  }

  function handleAddBeat() {
    const updatedBeats = [...chapter.beats, '']
    onUpdate(chapterIndex, { beats: updatedBeats })
  }

  function handleRemoveBeat(beatIndex: number) {
    const updatedBeats = chapter.beats.filter((_, i) => i !== beatIndex)
    onUpdate(chapterIndex, { beats: updatedBeats })
  }

  return (
    <div className="p-6 space-y-6">
      {/* Chapter header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Chapter {chapter.number}</span>
          <span>·</span>
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${ACT_COLORS[chapter.act] ?? 'bg-muted text-muted-foreground'}`}
          >
            Act {chapter.act}
          </span>
          {chapter.beat_sheet_mapping && (
            <Badge variant="secondary" className="text-xs">
              {chapter.beat_sheet_mapping}
            </Badge>
          )}
        </div>

        {/* Title — editable */}
        <InlineEditable
          value={chapter.title}
          onSave={handleTitleSave}
          as="h2"
          className="text-2xl font-bold"
          placeholder="Chapter title..."
        />
      </div>

      {/* Summary — editable */}
      <div className="space-y-1.5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Summary
        </h3>
        <InlineEditable
          value={chapter.summary}
          onSave={handleSummarySave}
          as="p"
          className="text-sm leading-relaxed"
          multiline
          placeholder="Chapter summary..."
        />
      </div>

      {/* Plot beats — each beat is editable */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Plot Beats
          </h3>
          <button
            onClick={handleAddBeat}
            className="text-xs text-primary hover:underline underline-offset-2"
          >
            + Add beat
          </button>
        </div>
        {chapter.beats.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No beats yet. Add one above.</p>
        ) : (
          <ol className="space-y-2">
            {chapter.beats.map((beat, beatIndex) => (
              <li key={beatIndex} className="flex items-start gap-2 group">
                <span className="text-xs text-muted-foreground mt-1.5 w-5 shrink-0 text-right">
                  {beatIndex + 1}.
                </span>
                <div className="flex-1">
                  <InlineEditable
                    value={beat}
                    onSave={(value) => handleBeatSave(beatIndex, value)}
                    as="p"
                    className="text-sm"
                    multiline
                    placeholder="Plot beat..."
                  />
                </div>
                <button
                  onClick={() => handleRemoveBeat(beatIndex)}
                  className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive transition-all mt-1 shrink-0"
                  aria-label="Remove beat"
                >
                  ✕
                </button>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* Featured characters — display only (future: link to story bible) */}
      {chapter.characters_featured && chapter.characters_featured.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Featured Characters
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {chapter.characters_featured.map((name) => (
              <Link
                key={name}
                href={`/projects/${projectId}/story-bible`}
                className="text-xs px-2 py-0.5 border border-border rounded text-muted-foreground hover:text-[color:var(--gold)] hover:border-[color:var(--gold)]/40 transition-colors"
              >
                {name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

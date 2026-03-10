'use client'

import { useMemo, useRef, useEffect } from 'react'

interface ChapterReadingViewProps {
  text: string
  wordCount: number
  onClickToEdit: () => void
  conflictHighlights?: string[]
}

function renderInlineMarkdown(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = []
  const regex = /(\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*)/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }
    if (match[2]) {
      parts.push(<strong key={match.index}><em>{match[2]}</em></strong>)
    } else if (match[3]) {
      parts.push(<strong key={match.index}>{match[3]}</strong>)
    } else if (match[4]) {
      parts.push(<em key={match.index}>{match[4]}</em>)
    }
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return parts.length > 0 ? parts : [text]
}

/**
 * Extract meaningful keywords from a conflicting fact string.
 * Strips common short words and returns terms >= 4 chars for fuzzy matching.
 */
function extractSearchTerms(fact: string): string[] {
  const stopWords = new Set([
    'the', 'and', 'that', 'this', 'with', 'from', 'have', 'has', 'had',
    'was', 'were', 'been', 'being', 'will', 'would', 'could', 'should',
    'their', 'there', 'they', 'them', 'than', 'then', 'what', 'when',
    'where', 'which', 'while', 'about', 'after', 'before', 'into',
    'does', 'done', 'each', 'also', 'just', 'more', 'most', 'some',
    'such', 'only', 'other', 'over', 'very', 'still',
  ])

  return fact
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, '')
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !stopWords.has(w))
}

/**
 * Check if a paragraph is relevant to any conflict fact.
 * A paragraph matches if it contains at least 2 keywords from any single fact,
 * or 1 keyword that's >= 6 chars (likely a proper noun or specific term).
 */
function paragraphMatchesConflict(paragraph: string, allTermSets: string[][]): boolean {
  const lower = paragraph.toLowerCase()
  for (const terms of allTermSets) {
    let matchCount = 0
    for (const term of terms) {
      if (lower.includes(term)) {
        if (term.length >= 6) return true
        matchCount++
        if (matchCount >= 2) return true
      }
    }
  }
  return false
}

export function ChapterReadingView({ text, wordCount, onClickToEdit, conflictHighlights }: ChapterReadingViewProps) {
  const firstHighlightRef = useRef<HTMLParagraphElement>(null)

  const paragraphs = useMemo(() => {
    if (!text) return []
    const normalized = text.replace(/\r\n/g, '\n')
    let blocks = normalized.split(/\n\n/)
    if (blocks.length <= 1 && normalized.includes('\n')) {
      blocks = normalized.split(/\n/)
    }
    return blocks.filter((p) => p.trim().length > 0)
  }, [text])

  // Pre-compute search term sets from conflict facts
  const conflictTermSets = useMemo(() => {
    if (!conflictHighlights?.length) return []
    return conflictHighlights.map(extractSearchTerms).filter((t) => t.length > 0)
  }, [conflictHighlights])

  // Auto-scroll to first highlighted paragraph
  useEffect(() => {
    if (firstHighlightRef.current) {
      firstHighlightRef.current.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }
  }, [conflictTermSets])

  let firstHighlightSet = false

  return (
    <div>
      <article
        onClick={onClickToEdit}
        className="cursor-text"
        style={{ fontFamily: 'var(--font-literata), Georgia, serif' }}
      >
        {paragraphs.map((paragraph, i) => {
          const trimmed = paragraph.trim()

          if (/^(\*\s*\*\s*\*|---+)$/.test(trimmed)) {
            return (
              <div key={i} className="my-10 text-center text-muted-foreground/50 tracking-[0.5em] text-sm select-none">
                * * *
              </div>
            )
          }

          const isConflict = conflictTermSets.length > 0 && paragraphMatchesConflict(trimmed, conflictTermSets)
          const isFirstHighlight = isConflict && !firstHighlightSet
          if (isFirstHighlight) firstHighlightSet = true

          return (
            <p
              key={i}
              ref={isFirstHighlight ? firstHighlightRef : undefined}
              className={`mb-[1.1em] text-[1.05rem] leading-[1.85] ${
                isConflict
                  ? 'bg-destructive/10 border-l-2 border-destructive pl-4 -ml-4 rounded-r-sm text-foreground'
                  : 'text-foreground/90'
              }`}
            >
              {renderInlineMarkdown(paragraph)}
            </p>
          )
        })}
      </article>

      {conflictTermSets.length > 0 && (
        <div className="mt-6 rounded-md border border-destructive/30 bg-destructive/5 p-3">
          <p className="text-xs font-medium text-destructive">Continuity conflicts detected</p>
          <ul className="mt-1.5 space-y-1">
            {conflictHighlights!.map((fact, i) => (
              <li key={i} className="text-xs text-muted-foreground">
                {fact}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-10 pt-4 border-t border-border">
        <span className="text-xs text-muted-foreground tabular-nums">
          {wordCount.toLocaleString()} words
        </span>
      </div>
    </div>
  )
}

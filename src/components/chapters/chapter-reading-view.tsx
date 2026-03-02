'use client'

import { useMemo } from 'react'

interface ChapterReadingViewProps {
  text: string
  wordCount: number
  onClickToEdit: () => void
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

export function ChapterReadingView({ text, wordCount, onClickToEdit }: ChapterReadingViewProps) {
  const paragraphs = useMemo(() => {
    if (!text) return []
    const normalized = text.replace(/\r\n/g, '\n')
    let blocks = normalized.split(/\n\n/)
    if (blocks.length <= 1 && normalized.includes('\n')) {
      blocks = normalized.split(/\n/)
    }
    return blocks.filter((p) => p.trim().length > 0)
  }, [text])

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

          return (
            <p
              key={i}
              className="mb-[1.1em] text-[1.05rem] leading-[1.85] text-foreground/90"
            >
              {renderInlineMarkdown(paragraph)}
            </p>
          )
        })}
      </article>

      <div className="mt-10 pt-4 border-t border-border">
        <span className="text-xs text-muted-foreground tabular-nums">
          {wordCount.toLocaleString()} words
        </span>
      </div>
    </div>
  )
}

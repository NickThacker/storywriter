import type { AssembledBook } from './assemble'

// ──────────────────────────────────────────────────────────────────────────────
// buildTxt — generate a plain text buffer from an AssembledBook
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Build a plain text document from an AssembledBook.
 * Structure: title block -> table of contents -> chapters with separators.
 * No external library required.
 */
export function buildTxt(book: AssembledBook): Buffer {
  const lines: string[] = []

  // ── Title block ──
  const titleLine = `=== ${book.title.toUpperCase()} ===`
  lines.push(titleLine)
  lines.push(`by ${book.author}`)
  lines.push('')
  lines.push('')

  // ── Table of Contents ──
  lines.push('--- TABLE OF CONTENTS ---')
  lines.push('')
  for (const chapter of book.chapters) {
    const draftMarker = chapter.isDraft ? ' [DRAFT]' : ''
    lines.push(`Chapter ${chapter.number}: ${chapter.title}${draftMarker}`)
  }
  lines.push('')
  lines.push('')

  // ── Chapters ──
  for (const chapter of book.chapters) {
    const draftMarker = chapter.isDraft ? ' [DRAFT]' : ''
    const chapterHeader = `=== Chapter ${chapter.number}: ${chapter.title}${draftMarker} ===`

    lines.push(chapterHeader)
    lines.push('')

    const bodyText = chapter.text || '[No content]'
    lines.push(bodyText)

    // Two blank lines between chapters
    lines.push('')
    lines.push('')
  }

  const text = lines.join('\n')
  return Buffer.from(text, 'utf-8')
}

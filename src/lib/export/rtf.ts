import type { AssembledBook } from './assemble'

// ──────────────────────────────────────────────────────────────────────────────
// RTF escape helper
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Escape a string for safe inclusion in an RTF document.
 * - Escapes RTF special characters: { } \
 * - Converts non-ASCII characters to RTF Unicode escapes (\uNNNN?)
 */
function escapeRtf(text: string): string {
  let result = ''
  for (const char of text) {
    const code = char.charCodeAt(0)
    if (char === '{') {
      result += '\\{'
    } else if (char === '}') {
      result += '\\}'
    } else if (char === '\\') {
      result += '\\\\'
    } else if (code > 127) {
      // RTF Unicode escape: \uNNNN followed by a fallback character (?)
      result += `\\u${code}?`
    } else {
      result += char
    }
  }
  return result
}

// ──────────────────────────────────────────────────────────────────────────────
// buildRtf — generate an RTF buffer from an AssembledBook
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Hand-generate an RTF document suitable for Vellum import.
 * Structure: RTF header -> title page -> chapters with headings and page breaks.
 * No external library required — RTF spec is stable for basic formatting.
 */
export function buildRtf(book: AssembledBook): Buffer {
  const lines: string[] = []

  // RTF document header
  lines.push(`{\\rtf1\\ansi\\deff0`)
  lines.push(`{\\fonttbl{\\f0 Times New Roman;}}`)
  lines.push(`{\\info{\\title ${escapeRtf(book.title)}}}`)

  // Title page: centered, large font title, author, page break
  lines.push(`\\f0\\fs48\\qc ${escapeRtf(book.title)}\\par`)
  lines.push(`\\fs28 by ${escapeRtf(book.author)}\\par`)
  lines.push(`\\page`)

  // Chapters
  for (const chapter of book.chapters) {
    const titlePrefix = chapter.isDraft ? '[DRAFT] ' : ''
    const chapterHeading = `Chapter ${chapter.number}: ${titlePrefix}${chapter.title}`

    // Chapter heading: bold, larger font
    lines.push(`\\fs32\\b ${escapeRtf(chapterHeading)}\\b0\\par`)
    lines.push(`\\fs24\\ql`)

    // Chapter body: split on double newlines for paragraphs
    const bodyText = chapter.text || '[No content]'
    const paragraphs = bodyText.split(/\n\n+/)

    for (const para of paragraphs) {
      const trimmed = para.trim()
      if (!trimmed) continue

      // Handle single newlines within a paragraph as line breaks
      const lines2 = trimmed.split('\n')
      const rtfPara = lines2.map(escapeRtf).join('\\line ')
      lines.push(`${rtfPara}\\par`)
    }

    // Page break after each chapter
    lines.push(`\\page`)
  }

  // Close RTF document
  lines.push(`}`)

  const rtf = lines.join('\n')
  return Buffer.from(rtf, 'utf-8')
}

import epub from 'epub-gen-memory'
import type { Options } from 'epub-gen-memory'
import type { AssembledBook } from './assemble'

// ──────────────────────────────────────────────────────────────────────────────
// HTML escaping helper
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Escape HTML special characters so chapter text is valid HTML content.
 * Per research pitfall 5: epub-gen-memory treats content as raw HTML.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// ──────────────────────────────────────────────────────────────────────────────
// buildEpub — generate an ePub buffer from an AssembledBook
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Build an ePub document from an AssembledBook.
 * Uses epub-gen-memory with HTML-escaped chapter content.
 * Draft chapters are marked with an [DRAFT] indicator.
 */
export async function buildEpub(book: AssembledBook): Promise<Buffer> {
  const content = book.chapters.map((chapter) => {
    const titlePrefix = chapter.isDraft ? '[DRAFT] ' : ''
    const chapterTitle = `${titlePrefix}${chapter.title}`

    // Build HTML content from chapter text
    const bodyText = chapter.text || ''
    // Split on double newlines for paragraphs
    const paragraphs = bodyText
      .split(/\n\n+/)
      .map((p) => p.trim())
      .filter(Boolean)

    const htmlParagraphs =
      paragraphs.length > 0
        ? paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join('\n')
        : '<p>[No content]</p>'

    // Prepend draft marker if applicable
    const draftMarker = chapter.isDraft ? '<p><em>[DRAFT]</em></p>\n' : ''
    const htmlContent = `${draftMarker}${htmlParagraphs}`

    return {
      title: chapterTitle,
      content: htmlContent,
    }
  })

  const options: Options = {
    title: book.title,
    author: book.author,
    tocTitle: 'Table of Contents',
    version: 3,
  }

  return await epub(options, content)
}

import {
  Document,
  Packer,
  Paragraph,
  HeadingLevel,
  PageBreak,
  TextRun,
  AlignmentType,
} from 'docx'
import type { AssembledBook } from './assemble'

// ──────────────────────────────────────────────────────────────────────────────
// buildDocx — generate a DOCX buffer from an AssembledBook
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Build a DOCX document from an AssembledBook.
 * Structure: title page -> manual TOC -> chapters with page breaks.
 * Uses Packer.toBuffer() (server-side only, not toBlob).
 */
export async function buildDocx(book: AssembledBook): Promise<Buffer> {
  const children: Paragraph[] = []

  // ── Title page ──
  children.push(
    new Paragraph({
      text: book.title,
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
    })
  )
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: book.author,
          size: 28, // 14pt in half-points
        }),
      ],
      alignment: AlignmentType.CENTER,
    })
  )
  // Page break after title page
  children.push(
    new Paragraph({
      children: [new PageBreak()],
    })
  )

  // ── Manual Table of Contents ──
  children.push(
    new Paragraph({
      text: 'Table of Contents',
      heading: HeadingLevel.HEADING_1,
    })
  )
  for (const chapter of book.chapters) {
    const prefix = chapter.isDraft ? '[DRAFT] ' : ''
    children.push(
      new Paragraph({
        text: `Chapter ${chapter.number}: ${prefix}${chapter.title}`,
        heading: HeadingLevel.HEADING_2,
      })
    )
  }
  // Page break after TOC
  children.push(
    new Paragraph({
      children: [new PageBreak()],
    })
  )

  // ── Chapters ──
  for (let i = 0; i < book.chapters.length; i++) {
    const chapter = book.chapters[i]
    const titlePrefix = chapter.isDraft ? '[DRAFT] ' : ''

    // Chapter heading
    children.push(
      new Paragraph({
        text: `Chapter ${chapter.number}: ${titlePrefix}${chapter.title}`,
        heading: HeadingLevel.HEADING_1,
      })
    )

    // Body paragraphs: split on double newlines first, then handle line breaks within
    const bodyText = chapter.text || '[No content]'
    const paragraphs = bodyText.split(/\n\n+/)

    for (const para of paragraphs) {
      if (!para.trim()) continue

      // Split on single newlines for inline line breaks
      const lines = para.split('\n')
      const runs: TextRun[] = []

      for (let j = 0; j < lines.length; j++) {
        runs.push(new TextRun({ text: lines[j] }))
        if (j < lines.length - 1) {
          runs.push(new TextRun({ text: '', break: 1 }))
        }
      }

      children.push(new Paragraph({ children: runs }))
    }

    // Page break between chapters (not after the last one)
    if (i < book.chapters.length - 1) {
      children.push(
        new Paragraph({
          children: [new PageBreak()],
        })
      )
    }
  }

  const doc = new Document({
    sections: [
      {
        children,
      },
    ],
  })

  return Packer.toBuffer(doc)
}

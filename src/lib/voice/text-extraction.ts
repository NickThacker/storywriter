/**
 * Extract plain text from a file buffer.
 * Supports: pdf, docx, txt
 *
 * Uses dynamic imports so mammoth/pdf-parse only load when needed,
 * avoiding module-load crashes on serverless runtimes.
 */
export async function extractTextFromFile(
  buffer: Buffer,
  extension: string
): Promise<string> {
  const ext = extension.toLowerCase().replace(/^\./, '')

  if (ext === 'docx') {
    const mammoth = await import('mammoth')
    const result = await mammoth.default.extractRawText({ buffer })
    return result.value
  }

  if (ext === 'pdf') {
    const { PDFParse } = await import('pdf-parse')
    const parser = new PDFParse({ data: buffer })
    const result = await parser.getText()
    return result.text
  }

  if (ext === 'txt') {
    return buffer.toString('utf-8')
  }

  throw new Error(`Unsupported file type: .${ext}. Supported: pdf, docx, txt`)
}

/** Max character length for combined writing samples sent to AI analysis (prevents token limit errors) */
export const MAX_SAMPLE_CHARS = 25_000

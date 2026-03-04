import { assembleChapters } from '@/lib/export/assemble'
import { buildDocx } from '@/lib/export/docx'
import { buildEpub } from '@/lib/export/epub'
import { buildRtf } from '@/lib/export/rtf'
import { buildTxt } from '@/lib/export/txt'

// Prevent caching — exports always fetch fresh data
export const dynamic = 'force-dynamic'

// Supported export formats
type ExportFormat = 'docx' | 'epub' | 'rtf' | 'txt'

const FORMAT_CONTENT_TYPES: Record<ExportFormat, string> = {
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  epub: 'application/epub+zip',
  rtf: 'application/rtf',
  txt: 'text/plain; charset=utf-8',
}

const FORMAT_EXTENSIONS: Record<ExportFormat, string> = {
  docx: 'docx',
  epub: 'epub',
  rtf: 'rtf',
  txt: 'txt',
}

/**
 * Sanitize a project title into a URL-safe filename slug.
 */
function titleToSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') // strip leading/trailing hyphens
    || 'novel'
}

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/export/[projectId]?format=docx|epub|rtf|txt&include=approved|all&penName=...
// ──────────────────────────────────────────────────────────────────────────────

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params
    const { searchParams } = new URL(request.url)

    // Parse query params
    const formatParam = searchParams.get('format') ?? 'txt'
    const includeParam = searchParams.get('include') ?? 'approved'
    const penName = searchParams.get('penName') ?? ''

    // Validate format
    if (!['docx', 'epub', 'rtf', 'txt'].includes(formatParam)) {
      return Response.json(
        { error: `Invalid format "${formatParam}". Must be one of: docx, epub, rtf, txt` },
        { status: 400 }
      )
    }
    const format = formatParam as ExportFormat

    // Validate includeMode
    if (!['approved', 'all'].includes(includeParam)) {
      return Response.json(
        { error: `Invalid include mode "${includeParam}". Must be "approved" or "all"` },
        { status: 400 }
      )
    }
    const includeMode = includeParam as 'approved' | 'all'

    // Assemble chapter data (handles auth and project ownership)
    const book = await assembleChapters(projectId, includeMode, penName)

    // Build format-specific buffer
    let buffer: Buffer

    switch (format) {
      case 'docx':
        buffer = await buildDocx(book)
        break
      case 'epub':
        buffer = await buildEpub(book)
        break
      case 'rtf':
        buffer = buildRtf(book)
        break
      case 'txt':
        buffer = buildTxt(book)
        break
    }

    // Generate filename from project title
    const slug = titleToSlug(book.title)
    const ext = FORMAT_EXTENSIONS[format]
    const filename = `${slug}-novel.${ext}`

    return new Response(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': FORMAT_CONTENT_TYPES[format],
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(buffer.byteLength),
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Export failed'

    // Return 401 for auth errors, 400 for user-facing errors, 500 for unexpected
    if (message.includes('Unauthorized')) {
      return Response.json({ error: message }, { status: 401 })
    }
    if (message.includes('not found') || message.includes('No approved') || message.includes('No chapters')) {
      return Response.json({ error: message }, { status: 400 })
    }

    console.error('[export route] Unexpected error:', error)
    return Response.json({ error: 'Export failed. Please try again.' }, { status: 500 })
  }
}

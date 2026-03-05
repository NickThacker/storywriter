// CRITICAL: force-dynamic prevents Vercel from caching the response
export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { buildVoiceReportPdf } from '@/lib/voice/pdf-report'
import type { AuthorPersonaRow } from '@/types/database'

export async function GET(_request: Request): Promise<Response> {
  // 1. Auth
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // 2. Get persona from DB
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: persona, error: personaError } = await (supabase as any)
    .from('author_personas')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (personaError || !persona) {
    return new Response(
      JSON.stringify({ error: 'No voice profile found. Complete the voice setup first.' }),
      {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }

  // 3. Generate PDF buffer
  let pdfBuffer: Buffer
  try {
    pdfBuffer = await buildVoiceReportPdf(persona as AuthorPersonaRow)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'PDF generation failed'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // 4. Return PDF as download
  return new Response(pdfBuffer as unknown as BodyInit, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="author-voice-report.pdf"',
      'Cache-Control': 'no-store',
    },
  })
}

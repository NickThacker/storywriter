// CRITICAL: force-dynamic prevents Vercel from caching the response
export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { extractTextFromFile } from '@/lib/voice/text-extraction'

export async function POST(request: Request): Promise<Response> {
  // 1. Auth
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // 2. Read multipart form data
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid form data' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const file = formData.get('file') as File | null
  if (!file || !file.name) {
    return new Response(JSON.stringify({ error: 'No file provided' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // 3. Extract text from file buffer
  const extension = file.name.split('.').pop() ?? ''
  const buffer = Buffer.from(await file.arrayBuffer())

  try {
    const text = await extractTextFromFile(buffer, extension)
    return new Response(JSON.stringify({ text }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Text extraction failed'
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

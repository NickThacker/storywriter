// Expected n8n test workflow:
// 1. Webhook trigger (POST /webhook/test)
// 2. IF node: validate X-Webhook-Secret header
//    Condition: {{ $request.headers['x-webhook-secret'] === $env.WEBHOOK_SECRET }}
//    False branch responds with 401
// 3. (Optional) LLM call to OpenRouter — tests full pipeline
// 4. Respond to Webhook: { success: true, message: "Pipeline working", echo: $json.message }

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { triggerN8nWorkflow, isN8nConfigured, N8nError } from '@/lib/n8n/client'

export async function POST() {
  // Auth check — only authenticated users can test the n8n pipeline
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Graceful degradation when n8n is not configured
  if (!isN8nConfigured()) {
    return NextResponse.json(
      { error: 'n8n is not configured', configured: false },
      { status: 503 }
    )
  }

  try {
    const result = await triggerN8nWorkflow('test', {
      message: 'Hello from StoryWriter',
      userId: user.id,
      timestamp: new Date().toISOString(),
    })

    return NextResponse.json(result, { status: 200 })
  } catch (err) {
    if (err instanceof N8nError) {
      return NextResponse.json(
        { error: 'n8n pipeline error', status: err.status, details: err.body },
        { status: err.status }
      )
    }

    console.error('[/api/n8n/test] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

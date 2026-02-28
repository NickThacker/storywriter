import { NextResponse } from 'next/server'
import { isN8nConfigured } from '@/lib/n8n/client'

export async function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      timestamp: new Date().toISOString(),
      n8n_configured: isN8nConfigured(),
    },
    { status: 200 }
  )
}

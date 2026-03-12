import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'

const resend = new Resend(process.env.RESEND_API_KEY)

const LINEAR_EMAIL = 'meridian-bug-4fc08f4e04ae@intake.linear.app'

export async function POST(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { description } = await req.json()

  if (!description || typeof description !== 'string' || description.trim().length === 0) {
    return NextResponse.json({ error: 'Description is required' }, { status: 400 })
  }

  try {
    await resend.emails.send({
      from: 'Meridian Bugs <bugs@meridianwrite.com>',
      to: LINEAR_EMAIL,
      replyTo: user.email ?? undefined,
      subject: `Bug Report from ${user.email ?? 'unknown user'}`,
      text: `Bug report submitted by ${user.email ?? 'unknown'} (${user.id})\n\n${description.trim()}`,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Failed to send bug report:', err)
    return NextResponse.json({ error: 'Failed to send report' }, { status: 500 })
  }
}

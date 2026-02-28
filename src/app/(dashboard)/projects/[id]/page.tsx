import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export const metadata = {
  title: 'Project — StoryWriter',
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: project } = await (supabase as any)
    .from('projects')
    .select('id, title, status, genre')
    .eq('id', id)
    .single()

  if (!project) redirect('/dashboard')

  return (
    <div className="container max-w-4xl py-8">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{(project as any).title}</CardTitle>
            <Badge variant="secondary">{(project as any).status}</Badge>
          </div>
          {(project as any).genre && (
            <p className="text-sm text-muted-foreground">{(project as any).genre}</p>
          )}
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Project workspace coming in Phase 2 — outline generation, chapter writing, and story bible management.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

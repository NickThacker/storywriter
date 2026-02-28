import { CreateProjectDialog } from '@/components/dashboard/create-project-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const EXAMPLE_PROJECTS = [
  {
    id: 'example-1',
    title: 'The Last Horizon',
    genre: 'Science Fiction',
    wordCount: 45000,
    chaptersTotal: 20,
    chaptersDone: 12,
    status: 'Writing' as const,
  },
  {
    id: 'example-2',
    title: 'Midnight Garden',
    genre: 'Mystery',
    wordCount: 28000,
    chaptersTotal: 16,
    chaptersDone: 6,
    status: 'Writing' as const,
  },
  {
    id: 'example-3',
    title: 'Echoes of Tomorrow',
    genre: 'Literary Fiction',
    wordCount: 72000,
    chaptersTotal: 30,
    chaptersDone: 30,
    status: 'Complete' as const,
  },
]

function ExampleCard({
  project,
}: {
  project: (typeof EXAMPLE_PROJECTS)[number]
}) {
  const progress = Math.round((project.chaptersDone / project.chaptersTotal) * 100)
  return (
    <Card className="opacity-60 pointer-events-none select-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">{project.title}</CardTitle>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant={project.status === 'Complete' ? 'outline' : 'default'}>
            {project.status}
          </Badge>
          <span className="text-xs text-muted-foreground">{project.genre}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{project.wordCount.toLocaleString()} words</span>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progress</span>
            <span>
              {project.chaptersDone} / {project.chaptersTotal} chapters
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function EmptyState() {
  return (
    <div className="space-y-8">
      <div className="text-center space-y-3 py-8">
        <h2 className="text-2xl font-bold">Welcome to StoryWriter</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Start your first novel — we&apos;ll guide you through the process. Here&apos;s a preview
          of what your dashboard will look like:
        </p>
        <CreateProjectDialog
          trigger={
            <Button size="lg" className="mt-2">
              Start Your Novel
            </Button>
          }
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {EXAMPLE_PROJECTS.map((project) => (
          <ExampleCard key={project.id} project={project} />
        ))}
      </div>
    </div>
  )
}

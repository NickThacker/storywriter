import { CreateProjectDialog } from '@/components/dashboard/create-project-dialog'

const EXAMPLE_PROJECTS = [
  {
    id: 'example-1',
    title: 'The Last Horizon',
    genre: 'Science Fiction',
    wordCount: 45000,
    chaptersTotal: 20,
    chaptersDone: 12,
    status: 'writing' as const,
  },
  {
    id: 'example-2',
    title: 'Midnight Garden',
    genre: 'Mystery',
    wordCount: 28000,
    chaptersTotal: 16,
    chaptersDone: 6,
    status: 'writing' as const,
  },
  {
    id: 'example-3',
    title: 'Echoes of Tomorrow',
    genre: 'Literary Fiction',
    wordCount: 72000,
    chaptersTotal: 30,
    chaptersDone: 30,
    status: 'complete' as const,
  },
]

function ExampleCard({
  project,
}: {
  project: (typeof EXAMPLE_PROJECTS)[number]
}) {
  const progress = Math.round((project.chaptersDone / project.chaptersTotal) * 100)
  const showProgress = project.status === 'writing'

  return (
    <div
      className="border border-border bg-card p-5 flex flex-col gap-4 select-none pointer-events-none opacity-50"
      style={{ borderRadius: 0 }}
    >
      <div className="flex-1">
        <h3
          className="font-[family-name:var(--font-literata)] text-foreground leading-snug mb-2"
          style={{ fontSize: '1.0625rem', fontWeight: 400 }}
        >
          {project.title}
        </h3>
        <div className="flex items-center gap-3">
          <span
            className="text-[0.65rem] uppercase tracking-[0.1em]"
            style={{ color: 'var(--gold)' }}
          >
            {project.status === 'complete' ? 'Complete' : 'Writing'}
          </span>
          <span className="text-border">·</span>
          <span className="text-[0.65rem] uppercase tracking-[0.08em] text-muted-foreground">
            {project.genre}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {showProgress && (
          <div>
            <div className="flex justify-between text-[0.65rem] text-muted-foreground mb-1.5 tracking-[0.04em]">
              <span>{project.chaptersDone} / {project.chaptersTotal} chapters</span>
              <span>{project.wordCount.toLocaleString()} words</span>
            </div>
            <div className="h-px w-full bg-border overflow-hidden">
              <div
                className="h-full"
                style={{ width: `${progress}%`, background: 'var(--gold)' }}
              />
            </div>
          </div>
        )}
        {!showProgress && (
          <span className="text-[0.65rem] tracking-[0.04em] text-muted-foreground">
            {project.wordCount.toLocaleString()} words
          </span>
        )}
      </div>
    </div>
  )
}

export function EmptyState() {
  return (
    <div className="space-y-12">
      {/* Hero prompt */}
      <div className="border-b border-border pb-10 space-y-5">
        <p
          className="text-[0.65rem] uppercase tracking-[0.15em]"
          style={{ color: 'var(--gold)' }}
        >
          Begin today
        </p>
        <h2
          className="font-[family-name:var(--font-literata)] text-foreground"
          style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)', fontWeight: 400, lineHeight: 1.15, maxWidth: '540px' }}
        >
          Your library is empty.<br />
          <em style={{ color: 'var(--gold)' }}>Start your first novel.</em>
        </h2>
        <p
          className="text-muted-foreground max-w-md"
          style={{ fontSize: '0.9375rem', lineHeight: 1.8, fontWeight: 300 }}
        >
          We&apos;ll walk you through premise, outline, and chapter generation — one step at a time.
        </p>
        <CreateProjectDialog
          trigger={
            <button
              className="text-[0.72rem] uppercase tracking-[0.1em] px-5 py-3 font-medium transition-opacity duration-150 hover:opacity-85"
              style={{
                background: 'var(--gold)',
                color: 'oklch(0.145 0 0)',
                borderRadius: 0,
              }}
            >
              Start Writing
            </button>
          }
        />
      </div>

      {/* Preview label */}
      <div className="space-y-4">
        <p className="text-[0.65rem] uppercase tracking-[0.15em] text-muted-foreground">
          Preview — what your library will look like
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {EXAMPLE_PROJECTS.map((project) => (
            <ExampleCard key={project.id} project={project} />
          ))}
        </div>
      </div>
    </div>
  )
}

'use client'

import { useRouter } from 'next/navigation'
import { ClipboardList, FileText, BookOpen, PenTool, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useGenerationGuard } from '@/components/chapters/generation-guard-context'
import { MemoryStatePanel } from '@/components/memory/memory-state-panel'

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

type Phase = 'intake' | 'outline' | 'story-bible' | 'chapters'

interface PhaseNavProps {
  projectId: string
  currentPhase: Phase
}

// ──────────────────────────────────────────────────────────────────────────────
// Phase config
// ──────────────────────────────────────────────────────────────────────────────

const PHASES: {
  id: Phase
  label: string
  path: (id: string) => string
  icon: typeof ClipboardList
}[] = [
  {
    id: 'intake',
    label: 'Intake',
    path: (id) => `/projects/${id}/intake`,
    icon: ClipboardList,
  },
  {
    id: 'outline',
    label: 'Outline',
    path: (id) => `/projects/${id}/outline`,
    icon: FileText,
  },
  {
    id: 'story-bible',
    label: 'Story Bible',
    path: (id) => `/projects/${id}/story-bible`,
    icon: BookOpen,
  },
  {
    id: 'chapters',
    label: 'Chapters',
    path: (id) => `/projects/${id}/chapters`,
    icon: PenTool,
  },
]

const PHASE_ORDER: Phase[] = ['intake', 'outline', 'story-bible', 'chapters']

// ──────────────────────────────────────────────────────────────────────────────
// PhaseNav
// ──────────────────────────────────────────────────────────────────────────────

export function PhaseNav({ projectId, currentPhase }: PhaseNavProps) {
  const currentIndex = PHASE_ORDER.indexOf(currentPhase)
  const router = useRouter()
  const { isGenerating } = useGenerationGuard()

  function handleNav(e: React.MouseEvent, href: string) {
    e.preventDefault()
    if (isGenerating) {
      const ok = window.confirm(
        'A chapter is being generated. Leaving now will lose the generated text.\n\nLeave anyway?'
      )
      if (!ok) return
    }
    router.push(href)
  }

  return (
    <nav className="border-b border-border bg-background">
      <div className="flex items-center px-4 py-2 overflow-x-auto gap-1">
        {PHASES.map((phase, index) => {
          const isActive = phase.id === currentPhase
          const isCompleted = index < currentIndex
          const Icon = phase.icon
          const href = phase.path(projectId)

          return (
            <div key={phase.id} className="flex items-center">
              {/* Connector line */}
              {index > 0 && (
                <div
                  className={cn(
                    'h-px w-6 shrink-0 mx-1',
                    index <= currentIndex ? 'bg-primary/40' : 'bg-border'
                  )}
                />
              )}

              <a
                href={href}
                onClick={(e) => handleNav(e, href)}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-3 py-2.5 text-xs font-medium transition-colors whitespace-nowrap',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : isCompleted
                    ? 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    : 'text-muted-foreground/60 hover:text-muted-foreground hover:bg-muted/30'
                )}
              >
                {isCompleted ? (
                  <Check className="h-3.5 w-3.5 text-primary/60 shrink-0" />
                ) : (
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                )}
                <span>{phase.label}</span>
              </a>
            </div>
          )
        })}

        {/* Memory panel — right-aligned, only shown when on chapters or beyond */}
        <div className="ml-auto shrink-0">
          <MemoryStatePanel projectId={projectId} />
        </div>
      </div>
    </nav>
  )
}

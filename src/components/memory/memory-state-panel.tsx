'use client'

import { useState, useCallback } from 'react'
import { Brain, ChevronDown, ChevronRight, Loader2 } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import type { ProjectMemoryRow, PlotThread } from '@/types/project-memory'

// ── Types ─────────────────────────────────────────────────────────────────────

interface MemoryStatePanelProps {
  projectId: string
}

// ── Collapsible section ───────────────────────────────────────────────────────

function Section({
  title,
  badge,
  children,
  defaultOpen = true,
}: {
  title: string
  badge?: number
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-border last:border-0">
      <button
        onClick={() => setOpen((p) => !p)}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-muted/40 transition-colors"
      >
        <span className="flex items-center gap-2 text-sm font-medium">
          {open ? (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          )}
          {title}
          {badge !== undefined && badge > 0 && (
            <Badge variant="secondary" className="text-xs px-1.5 py-0 h-4">
              {badge}
            </Badge>
          )}
        </span>
      </button>
      {open && <div className="px-4 pb-4 space-y-2">{children}</div>}
    </div>
  )
}

// ── Thread status badge ───────────────────────────────────────────────────────

function ThreadBadge({ status }: { status: PlotThread['status'] }) {
  const styles: Record<PlotThread['status'], string> = {
    introduced: 'bg-blue-50 text-blue-700 border-blue-200',
    active: 'bg-amber-50 text-amber-700 border-amber-200',
    advanced: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    resolved: 'bg-muted text-muted-foreground border-border',
  }
  return (
    <span className={`inline-flex text-[10px] font-medium px-1.5 py-0.5 rounded border ${styles[status]}`}>
      {status}
    </span>
  )
}

// ── Memory content ────────────────────────────────────────────────────────────

function MemoryContent({ memory }: { memory: ProjectMemoryRow }) {
  const openThreads = (memory.plot_threads ?? []).filter((t) => t.status !== 'resolved')
  const resolvedThreads = (memory.plot_threads ?? []).filter((t) => t.status === 'resolved')
  const characters = Object.values(memory.character_states ?? {})
  const unresolvedForeshadowing = (memory.foreshadowing ?? []).filter((f) => !f.resolved)
  const resolvedForeshadowing = (memory.foreshadowing ?? []).filter((f) => f.resolved)
  const continuityFacts = memory.continuity_facts ?? []
  const timeline = memory.timeline ?? []

  return (
    <div className="divide-y divide-border">
      {/* Open Threads */}
      <Section title="Open Threads" badge={openThreads.length}>
        {openThreads.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">No open threads tracked yet.</p>
        ) : (
          openThreads.map((t) => (
            <div key={t.id} className="rounded-md bg-muted/40 px-3 py-2 space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium">{t.name}</span>
                <ThreadBadge status={t.status} />
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{t.description}</p>
              {t.chapterReferences.length > 0 && (
                <p className="text-[10px] text-muted-foreground/70">
                  Ch {t.chapterReferences.join(', ')}
                </p>
              )}
            </div>
          ))
        )}
        {resolvedThreads.length > 0 && (
          <p className="text-[10px] text-muted-foreground/70 pt-1">
            +{resolvedThreads.length} resolved thread{resolvedThreads.length !== 1 ? 's' : ''}
          </p>
        )}
      </Section>

      {/* Character States */}
      <Section title="Character States" badge={characters.length}>
        {characters.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">No character states tracked yet.</p>
        ) : (
          characters.map((c) => (
            <div key={c.name} className="rounded-md bg-muted/40 px-3 py-2 space-y-1">
              <p className="text-xs font-medium">{c.name}</p>
              <div className="text-xs text-muted-foreground space-y-0.5">
                {c.emotionalState && <p>Emotional: {c.emotionalState}</p>}
                {c.physicalState && <p>Physical: {c.physicalState}</p>}
                {c.location && <p>Location: {c.location}</p>}
                {c.knowledge.length > 0 && (
                  <p>Knows: {c.knowledge.slice(-3).join('; ')}</p>
                )}
                {Object.keys(c.relationships).length > 0 && (
                  <div>
                    <p className="font-medium text-foreground/80 mt-1">Relationships:</p>
                    {Object.entries(c.relationships).map(([name, rel]) => (
                      <p key={name} className="pl-2">
                        {name}: {rel}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </Section>

      {/* Foreshadowing */}
      <Section title="Foreshadowing" badge={unresolvedForeshadowing.length} defaultOpen={false}>
        {unresolvedForeshadowing.length === 0 && resolvedForeshadowing.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">No foreshadowing tracked yet.</p>
        ) : (
          <>
            {unresolvedForeshadowing.map((f, i) => (
              <div key={i} className="rounded-md bg-muted/40 px-3 py-2 space-y-0.5">
                <p className="text-xs font-medium">{f.seed}</p>
                <p className="text-[10px] text-muted-foreground">
                  Planted Ch{f.plantedChapter} → intended: {f.intendedPayoff}
                </p>
              </div>
            ))}
            {resolvedForeshadowing.length > 0 && (
              <p className="text-[10px] text-muted-foreground/70 pt-1">
                +{resolvedForeshadowing.length} paid off
              </p>
            )}
          </>
        )}
      </Section>

      {/* Continuity Facts */}
      <Section title="Continuity Facts" badge={continuityFacts.length} defaultOpen={false}>
        {continuityFacts.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">No continuity facts tracked yet.</p>
        ) : (
          continuityFacts.map((f, i) => (
            <div key={i} className="flex items-start gap-2 text-xs">
              <span className="shrink-0 text-[10px] font-medium text-muted-foreground/70 uppercase tracking-wide mt-0.5">
                {f.category}
              </span>
              <span className="text-muted-foreground leading-relaxed">{f.fact}</span>
            </div>
          ))
        )}
      </Section>

      {/* Timeline */}
      <Section title="Timeline" badge={timeline.length} defaultOpen={false}>
        {timeline.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">No timeline events tracked yet.</p>
        ) : (
          <div className="space-y-1">
            {timeline.slice(-20).map((t, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <span className="shrink-0 text-[10px] font-medium text-muted-foreground/70">
                  Ch{t.chapterNumber}
                </span>
                <span className="text-muted-foreground leading-relaxed">{t.event}</span>
              </div>
            ))}
            {timeline.length > 20 && (
              <p className="text-[10px] text-muted-foreground/60">
                Showing last 20 of {timeline.length} events
              </p>
            )}
          </div>
        )}
      </Section>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export function MemoryStatePanel({ projectId }: MemoryStatePanelProps) {
  const [memory, setMemory] = useState<ProjectMemoryRow | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchMemory = useCallback(async () => {
    if (memory) return // already loaded
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/memory/state?projectId=${projectId}`)
      if (!res.ok) {
        const data = (await res.json()) as { error?: string }
        throw new Error(data.error ?? 'Failed to load memory')
      }
      const data = (await res.json()) as { memory: ProjectMemoryRow }
      setMemory(data.memory)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load memory')
    } finally {
      setLoading(false)
    }
  }, [projectId, memory])

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (open) void fetchMemory()
      else setMemory(null) // refresh on next open
    },
    [fetchMemory]
  )

  return (
    <Sheet onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <button
          className="flex items-center gap-1.5 rounded-md px-3 py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors whitespace-nowrap"
          title="View story memory"
        >
          <Brain className="h-3.5 w-3.5 shrink-0" />
          <span>Memory</span>
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[420px] sm:w-[480px] p-0 flex flex-col">
        <SheetHeader className="px-4 py-4 border-b border-border shrink-0">
          <SheetTitle className="text-sm font-semibold">Story Memory</SheetTitle>
          <SheetDescription className="text-xs">
            AI-maintained state — updates automatically after each chapter.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}
          {error && (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
          )}
          {memory && <MemoryContent memory={memory} />}
        </div>
      </SheetContent>
    </Sheet>
  )
}

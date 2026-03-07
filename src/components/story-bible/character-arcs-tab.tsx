'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, Circle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import type { CharacterArc } from '@/types/project-memory'

interface CharacterArcsTabProps {
  projectId: string
}

export function CharacterArcsTab({ projectId }: CharacterArcsTabProps) {
  const [arcs, setArcs] = useState<CharacterArc[]>([])
  const [loading, setLoading] = useState(true)
  const [synthesizing, setSynthesizing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchArcs = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/arc/${projectId}/synthesize`)
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(body.error ?? `Failed to fetch arcs (${res.status})`)
      }
      const data = (await res.json()) as CharacterArc[]
      setArcs(data)
    } catch (err) {
      console.error('[character-arcs-tab] fetch error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load character arcs')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    void fetchArcs()
  }, [fetchArcs])

  const handleSynthesize = useCallback(async () => {
    setSynthesizing(true)
    setError(null)
    try {
      const res = await fetch(`/api/arc/${projectId}/synthesize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(body.error ?? `Synthesis failed (${res.status})`)
      }
    } catch (err) {
      console.error('[character-arcs-tab] synthesize error:', err)
      setError(err instanceof Error ? err.message : 'Synthesis failed')
    } finally {
      setSynthesizing(false)
      // Refresh arcs after synthesis (whether it succeeded or failed)
      await fetchArcs()
    }
  }, [projectId, fetchArcs])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {arcs.length === 0
            ? 'No arc data yet.'
            : `${arcs.length} character arc${arcs.length === 1 ? '' : 's'}`}
        </p>
        <Button
          size="sm"
          variant="outline"
          onClick={handleSynthesize}
          disabled={synthesizing}
        >
          {synthesizing ? (
            <>
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              Synthesizing...
            </>
          ) : (
            <>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              {arcs.length === 0 ? 'Synthesize Now' : 'Re-synthesize All'}
            </>
          )}
        </Button>
      </div>

      {/* Error message */}
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {/* Empty state */}
      {arcs.length === 0 && !error && (
        <div className="rounded-md border border-dashed border-border px-6 py-10 text-center text-sm text-muted-foreground">
          <p>Arc synthesis runs automatically every 5 chapters.</p>
          <p className="mt-1">Click "Synthesize Now" to generate arc analysis for all current characters.</p>
        </div>
      )}

      {/* Arc cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {arcs.map((arc) => (
          <Card key={arc.id} className="flex flex-col">
            <CardHeader className="pb-2">
              <p className="font-semibold text-sm">{arc.character_name}</p>
              {arc.arc_summary && (
                <p className="text-xs italic text-muted-foreground leading-snug">{arc.arc_summary}</p>
              )}
            </CardHeader>

            <CardContent className="flex-1 space-y-3 pb-2">
              {/* Key moments */}
              {arc.key_moments.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-foreground mb-1">Key Moments</p>
                  <ul className="space-y-0.5">
                    {arc.key_moments.map((moment, idx) => (
                      <li key={idx} className="text-xs text-muted-foreground">
                        Ch {moment.chapter} — {moment.description}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Unresolved threads */}
              {arc.unresolved_threads.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-foreground mb-1">Unresolved Threads</p>
                  <ul className="space-y-0.5">
                    {arc.unresolved_threads.map((thread, idx) => (
                      <li key={idx} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                        <Circle className="h-2 w-2 mt-0.5 shrink-0 fill-muted-foreground text-muted-foreground" />
                        <span>{thread}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>

            <CardFooter className="pt-2 pb-3">
              <p className="text-xs text-muted-foreground">
                Synthesized through Chapter {arc.synthesized_through_chapter}
              </p>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  )
}

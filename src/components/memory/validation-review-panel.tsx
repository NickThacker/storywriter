'use client'

import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { Loader2, ShieldCheck, ShieldAlert, ShieldX, CheckCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import type { ScoredChange, ChangeDecision } from '@/lib/memory/analysis-validator'

// ── Types ────────────────────────────────────────────────────────────────────

interface ValidationRecord {
  id: string
  chapter_number: number
  scored_changes: ScoredChange[]
  status: string
}

interface ValidationReviewPanelProps {
  validationId: string
  chapterNumber: number
  onResolved: () => void
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function labelForType(type: string): string {
  const map: Record<string, string> = {
    summary: 'Chapter Summary',
    character_update: 'Character Update',
    timeline_event: 'Timeline Event',
    plot_thread_update: 'Plot Thread Update',
    new_plot_thread: 'New Plot Thread',
    foreshadowing_payoff: 'Foreshadowing Paid Off',
    new_foreshadowing: 'New Foreshadowing',
    continuity_fact: 'Continuity Fact',
    thematic: 'Thematic Development',
  }
  return map[type] ?? type
}

function DecisionBadge({ decision }: { decision: ChangeDecision }) {
  if (decision === 'auto_apply') {
    return (
      <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50 gap-1">
        <ShieldCheck className="h-3 w-3" />
        Auto-applied
      </Badge>
    )
  }
  if (decision === 'flag') {
    return (
      <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50 gap-1">
        <ShieldAlert className="h-3 w-3" />
        Auto-applied
      </Badge>
    )
  }
  if (decision === 'block') {
    return (
      <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50 gap-1">
        <ShieldAlert className="h-3 w-3" />
        Pending review
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50 gap-1">
      <ShieldX className="h-3 w-3" />
      Rejected by validator
    </Badge>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

export function ValidationReviewPanel({
  validationId,
  chapterNumber,
  onResolved,
}: ValidationReviewPanelProps) {
  const [open, setOpen] = useState(true)
  const [record, setRecord] = useState<ValidationRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [decisions, setDecisions] = useState<Record<string, 'approve' | 'reject'>>({})
  const [submitting, setSubmitting] = useState(false)

  // Fetch the validation record on mount
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch(`/api/memory/validate/${validationId}`)
        if (!res.ok) throw new Error('Failed to load validation')
        const data = (await res.json()) as ValidationRecord
        if (!cancelled) setRecord(data)
      } catch (err) {
        console.error('[ValidationReviewPanel] fetch error:', err)
        if (!cancelled) toast.error('Failed to load validation details')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [validationId])

  // Items needing author action (block + reject decisions from the validator)
  const actionableItems = record?.scored_changes.filter(
    (s) => s.decision === 'block' || s.decision === 'reject'
  ) ?? []

  // Items already applied but flagged as low-confidence (informational only)
  const flaggedItems = record?.scored_changes.filter((s) => s.decision === 'flag') ?? []

  const setDecision = useCallback((key: string, decision: 'approve' | 'reject') => {
    setDecisions((prev) => ({ ...prev, [key]: decision }))
  }, [])

  const handleApproveAll = useCallback(() => {
    const all: Record<string, 'approve' | 'reject'> = {}
    for (const item of actionableItems) {
      all[item.key] = 'approve'
    }
    setDecisions(all)
  }, [actionableItems])

  const pendingDecisions = actionableItems.filter((item) => !decisions[item.key])

  const handleSubmit = useCallback(async () => {
    if (pendingDecisions.length > 0) {
      toast.error(`${pendingDecisions.length} item${pendingDecisions.length > 1 ? 's' : ''} still need a decision`)
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/memory/validate/${validationId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decisions }),
      })
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(err.error ?? 'Resolve failed')
      }
      const result = (await res.json()) as { appliedCount: number }
      toast.success(
        result.appliedCount > 0
          ? `Applied ${result.appliedCount} approved change${result.appliedCount > 1 ? 's' : ''} to story memory`
          : 'Changes reviewed — rejected items discarded'
      )
      setOpen(false)
      onResolved()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to resolve'
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }, [validationId, decisions, pendingDecisions, onResolved])

  const hasUnresolvedActions = actionableItems.length > 0 && pendingDecisions.length > 0

  const handleOpenChange = useCallback((isOpen: boolean) => {
    if (!isOpen && !submitting) {
      if (hasUnresolvedActions) {
        // Block dismissal: force the author to make a decision
        toast.warning(`Review required — ${pendingDecisions.length} memory change${pendingDecisions.length > 1 ? 's' : ''} still need a decision before this dialog can be closed.`)
        return
      }
      setOpen(false)
      if (actionableItems.length === 0) {
        // No actionable items (all were auto-applied/flagged) — safe to resolve
        onResolved()
      }
    }
  }, [submitting, hasUnresolvedActions, pendingDecisions.length, actionableItems.length, onResolved])

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"
        onEscapeKeyDown={(e) => { if (hasUnresolvedActions) e.preventDefault() }}
        onInteractOutside={(e) => { if (hasUnresolvedActions) e.preventDefault() }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-orange-500" />
            Memory Validation — Chapter {chapterNumber}
          </DialogTitle>
          <DialogDescription>
            The validator flagged some proposed story-memory changes as uncertain.
            Review and approve or reject each one before they're written to your story memory.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Items needing approval */}
              {actionableItems.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Needs Your Decision ({actionableItems.length})
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleApproveAll}
                      className="h-7 text-xs gap-1"
                    >
                      <CheckCheck className="h-3 w-3" />
                      Approve All
                    </Button>
                  </div>

                  {actionableItems.map((item) => (
                    <div
                      key={item.key}
                      className="rounded-lg border border-border p-3 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-medium">{labelForType(item.type)}</span>
                            <DecisionBadge decision={item.decision} />
                            <span className="text-xs text-muted-foreground">
                              {item.confidence}% confidence
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {item.reasoning}
                          </p>
                          <pre className="text-xs bg-muted rounded p-2 overflow-x-auto whitespace-pre-wrap break-words max-h-24">
                            {typeof item.proposed === 'string'
                              ? item.proposed
                              : JSON.stringify(item.proposed, null, 2)}
                          </pre>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant={decisions[item.key] === 'approve' ? 'default' : 'outline'}
                          className="h-7 text-xs"
                          onClick={() => setDecision(item.key, 'approve')}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant={decisions[item.key] === 'reject' ? 'destructive' : 'outline'}
                          className="h-7 text-xs"
                          onClick={() => setDecision(item.key, 'reject')}
                        >
                          Reject
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Flagged items — applied but low-confidence (informational) */}
              {flaggedItems.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Auto-applied — verify if needed ({flaggedItems.length})
                  </p>
                  <div className="rounded-lg border border-amber-100 bg-amber-50/40 divide-y divide-amber-100">
                    {flaggedItems.map((item) => (
                      <div key={item.key} className="px-3 py-2 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium">{labelForType(item.type)}</span>
                          <DecisionBadge decision="flag" />
                          <span className="text-xs text-muted-foreground">
                            {item.confidence}%
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">{item.reasoning}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    These changes were written to memory. No action needed — they're shown for your awareness.
                  </p>
                </div>
              )}

              {actionableItems.length === 0 && flaggedItems.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No items to review.
                </p>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!loading && actionableItems.length > 0 && (
          <div className="border-t border-border pt-4 flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              {pendingDecisions.length > 0
                ? `${pendingDecisions.length} item${pendingDecisions.length > 1 ? 's' : ''} remaining`
                : 'All items reviewed'}
            </p>
            <Button
              onClick={() => void handleSubmit()}
              disabled={submitting || pendingDecisions.length > 0}
              size="sm"
              className="gap-1.5"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Applying...
                </>
              ) : (
                'Apply Decisions'
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

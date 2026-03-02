'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { detectScenes } from '@/lib/checkpoint/scene-utils'
import type { DetectedScene } from '@/lib/checkpoint/scene-utils'
import { cn } from '@/lib/utils'

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

interface RewriteDialogProps {
  chapterNumber: number
  chapterTitle: string
  chapterText: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onRewrite: (adjustments: string) => void
  onSceneRewrite?: (sceneIndex: number, adjustments: string) => void
}

// ──────────────────────────────────────────────────────────────────────────────
// RewriteDialog — guided mode + scene-level rewrite support
// ──────────────────────────────────────────────────────────────────────────────

export function RewriteDialog({
  chapterNumber,
  chapterTitle,
  chapterText,
  open,
  onOpenChange,
  onRewrite,
  onSceneRewrite,
}: RewriteDialogProps) {
  // ── Mode: guided (default) vs advanced free-text
  const [mode, setMode] = useState<'guided' | 'advanced'>('guided')

  // ── Guided fields
  const [tone, setTone] = useState('')
  const [pacing, setPacing] = useState('')
  const [characterFocus, setCharacterFocus] = useState('')

  // ── Advanced field
  const [adjustments, setAdjustments] = useState('')

  // ── Scene scope
  const [rewriteScope, setRewriteScope] = useState<'full' | 'scene'>('full')
  const [selectedSceneIndex, setSelectedSceneIndex] = useState<number | null>(null)

  // ── Scene detection (memoized from chapterText)
  const scenes: DetectedScene[] | null = useMemo(
    () => (chapterText ? detectScenes(chapterText) : null),
    [chapterText]
  )

  // ── Build adjustments string from guided fields
  function buildGuidedAdjustments(): string {
    const parts: string[] = []
    if (tone.trim()) parts.push(`Tone: ${tone.trim()}`)
    if (pacing.trim()) parts.push(`Pacing: ${pacing.trim()}`)
    if (characterFocus.trim()) parts.push(`Character Focus: ${characterFocus.trim()}`)
    return parts.join('\n')
  }

  // ── Whether submit is enabled
  const canSubmit =
    mode === 'guided'
      ? tone.trim().length > 0 || pacing.trim().length > 0 || characterFocus.trim().length > 0
      : adjustments.trim().length > 0

  function handleSubmit() {
    if (!canSubmit) return

    const finalAdjustments =
      mode === 'guided' ? buildGuidedAdjustments() : adjustments.trim()

    if (rewriteScope === 'scene' && selectedSceneIndex !== null && onSceneRewrite) {
      onSceneRewrite(selectedSceneIndex, finalAdjustments)
    } else {
      onRewrite(finalAdjustments)
    }

    onOpenChange(false)
    resetFields()
  }

  function resetFields() {
    setMode('guided')
    setTone('')
    setPacing('')
    setCharacterFocus('')
    setAdjustments('')
    setRewriteScope('full')
    setSelectedSceneIndex(null)
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      resetFields()
    }
    onOpenChange(next)
  }

  const submitLabel =
    rewriteScope === 'scene' && selectedSceneIndex !== null
      ? 'Rewrite Scene'
      : 'Rewrite Chapter'

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Rewrite Chapter {chapterNumber}: {chapterTitle}
          </DialogTitle>
          <DialogDescription>
            Describe the changes you want. The chapter will be regenerated with your adjustments.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2 space-y-4">
          {/* ── Scene scope selector (only shown when scene breaks detected) */}
          {scenes && scenes.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Rewrite Scope
              </p>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="rewrite-scope"
                    value="full"
                    checked={rewriteScope === 'full'}
                    onChange={() => {
                      setRewriteScope('full')
                      setSelectedSceneIndex(null)
                    }}
                    className="accent-primary"
                  />
                  <span className="text-sm">Full Chapter</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="rewrite-scope"
                    value="scene"
                    checked={rewriteScope === 'scene'}
                    onChange={() => setRewriteScope('scene')}
                    className="accent-primary"
                  />
                  <span className="text-sm">Selected Scene</span>
                </label>
              </div>

              {/* Scene list */}
              {rewriteScope === 'scene' && (
                <div className="space-y-1 mt-1">
                  {scenes.map((scene) => (
                    <button
                      key={scene.index}
                      type="button"
                      onClick={() => setSelectedSceneIndex(scene.index)}
                      className={cn(
                        'w-full text-left rounded-md px-3 py-2 text-xs transition-colors border',
                        selectedSceneIndex === scene.index
                          ? 'border-primary/60 bg-primary/10 text-foreground ring-1 ring-primary/30'
                          : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                    >
                      <span className="font-medium">Scene {scene.index + 1}:</span>{' '}
                      {scene.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Mode toggle: Guided | Advanced */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setMode('guided')}
              className={cn(
                'rounded-md px-3 py-1 text-xs font-medium transition-colors border',
                mode === 'guided'
                  ? 'border-primary/60 bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              Guided
            </button>
            <button
              type="button"
              onClick={() => setMode('advanced')}
              className={cn(
                'rounded-md px-3 py-1 text-xs font-medium transition-colors border',
                mode === 'advanced'
                  ? 'border-primary/60 bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              Advanced
            </button>
          </div>

          {/* ── Guided mode: structured fields */}
          {mode === 'guided' && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Tone
                </label>
                <input
                  type="text"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  placeholder="e.g., darker, more suspenseful, lighter"
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Pacing
                </label>
                <input
                  type="text"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  placeholder="e.g., faster action, slower introspection"
                  value={pacing}
                  onChange={(e) => setPacing(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Character Focus
                </label>
                <input
                  type="text"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  placeholder="e.g., focus on antagonist's perspective"
                  value={characterFocus}
                  onChange={(e) => setCharacterFocus(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* ── Advanced mode: free-text textarea */}
          {mode === 'advanced' && (
            <div className="space-y-2">
              <textarea
                className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                placeholder="e.g., Make the tone darker. Focus more on the antagonist's perspective. Add more sensory description."
                value={adjustments}
                onChange={(e) => setAdjustments(e.target.value)}
                autoFocus
              />
              {adjustments.trim().length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Enter your adjustments to enable the rewrite.
                </p>
              )}
            </div>
          )}

          {/* ── Replacement note */}
          <div className="rounded-md bg-muted px-3 py-2">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Note:</span> The existing chapter text
              will be replaced. Save a copy elsewhere if you want to keep the original.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              !canSubmit ||
              (rewriteScope === 'scene' && selectedSceneIndex === null)
            }
          >
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

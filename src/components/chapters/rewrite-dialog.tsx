'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

interface RewriteDialogProps {
  chapterNumber: number
  chapterTitle: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onRewrite: (adjustments: string) => void
}

// ──────────────────────────────────────────────────────────────────────────────
// RewriteDialog
// ──────────────────────────────────────────────────────────────────────────────

export function RewriteDialog({
  chapterNumber,
  chapterTitle,
  open,
  onOpenChange,
  onRewrite,
}: RewriteDialogProps) {
  const [adjustments, setAdjustments] = useState('')

  function handleSubmit() {
    if (!adjustments.trim()) return
    onRewrite(adjustments.trim())
    onOpenChange(false)
    setAdjustments('')
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      setAdjustments('')
    }
    onOpenChange(next)
  }

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

        <div className="py-2 space-y-3">
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
          <Button onClick={handleSubmit} disabled={adjustments.trim().length === 0}>
            Rewrite Chapter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

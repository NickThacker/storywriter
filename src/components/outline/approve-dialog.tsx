'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { approveOutline } from '@/actions/outline'
import type { GeneratedOutline } from '@/lib/outline/schema'
import { Loader2 } from 'lucide-react'

interface ApproveDialogProps {
  projectId: string
  outlineId: string
  outlineData: GeneratedOutline
  open: boolean
  onOpenChange: (open: boolean) => void
  onApproved: () => void
}

export function ApproveDialog({
  projectId,
  outlineId,
  outlineData,
  open,
  onOpenChange,
  onApproved,
}: ApproveDialogProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const characterCount = outlineData.characters.length
  const locationCount = outlineData.locations.length

  function handleApprove() {
    setError(null)
    startTransition(async () => {
      const result = await approveOutline(projectId, outlineId, outlineData)
      if ('error' in result) {
        setError(result.error)
        toast.error(`Failed to approve outline: ${result.error}`)
        return
      }
      toast.success('Outline approved! Your story bible has been populated.')
      onOpenChange(false)
      onApproved()
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Approve Outline</DialogTitle>
          <DialogDescription>
            Approving your outline will populate the story bible with characters
            and locations, and mark your project as ready for writing.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          {/* Summary of what will be created */}
          <div className="rounded-md border bg-muted/50 px-4 py-3 space-y-1">
            <p className="text-sm font-medium">What will be created:</p>
            <ul className="text-sm text-muted-foreground space-y-0.5">
              <li>
                {characterCount} character{characterCount !== 1 ? 's' : ''} added to your story bible
              </li>
              <li>
                {locationCount} location{locationCount !== 1 ? 's' : ''} added to your story bible
              </li>
            </ul>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button onClick={handleApprove} disabled={isPending}>
            {isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            {isPending ? 'Approving...' : 'Approve & Continue'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

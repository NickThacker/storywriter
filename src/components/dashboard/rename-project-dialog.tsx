'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { updateProject } from '@/actions/projects'

interface RenameProjectDialogProps {
  projectId: string
  currentTitle: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function RenameProjectDialog({
  projectId,
  currentTitle,
  open,
  onOpenChange,
}: RenameProjectDialogProps) {
  const [title, setTitle] = useState(currentTitle)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleRename = () => {
    const trimmed = title.trim()
    if (!trimmed || trimmed === currentTitle) {
      onOpenChange(false)
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await updateProject(projectId, { title: trimmed } as Partial<any>)
      if ('error' in result) {
        setError(result.error)
      } else {
        onOpenChange(false)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rename Project</DialogTitle>
          <DialogDescription>Enter a new title for your project.</DialogDescription>
        </DialogHeader>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleRename() }}
          placeholder="Project title"
          autoFocus
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleRename} disabled={isPending || !title.trim()}>
            {isPending ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

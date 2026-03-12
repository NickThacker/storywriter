'use client'

import { useState } from 'react'
import { Bug } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'

export function BugReportButton({ userEmail }: { userEmail?: string }) {
  const [open, setOpen] = useState(false)
  const [description, setDescription] = useState('')
  const [sending, setSending] = useState(false)

  async function handleSubmit() {
    if (!description.trim()) return
    setSending(true)
    try {
      const res = await fetch('/api/bug-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: description.trim() }),
      })
      if (!res.ok) throw new Error()
      toast.success('Bug report sent — thank you!')
      setDescription('')
      setOpen(false)
    } catch {
      toast.error('Failed to send bug report. Please try again.')
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background/90 text-muted-foreground shadow-md backdrop-blur-sm transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
        aria-label="Report a bug"
      >
        <Bug className="h-4 w-4" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Report a Bug</DialogTitle>
            <DialogDescription>
              Describe what went wrong and we&apos;ll look into it.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {userEmail && (
              <div className="text-xs text-muted-foreground">
                From: {userEmail}
              </div>
            )}
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What happened? What did you expect to happen?"
              rows={5}
              className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              autoFocus
            />
          </div>

          <DialogFooter>
            <button
              onClick={() => setOpen(false)}
              className="rounded-md px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={sending || !description.trim()}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {sending ? 'Sending...' : 'Send Report'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

'use client'

// Stub: full implementation planned for Phase 2 story bible plans

type EntityType = 'character' | 'location' | 'world-fact'

interface AddEntityDialogProps {
  projectId: string
  entityType: EntityType
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
}

export function AddEntityDialog({
  open,
  onOpenChange,
}: AddEntityDialogProps) {
  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
    >
      <div className="rounded-lg border border-border bg-card p-6 shadow-lg">
        <p className="text-muted-foreground text-sm">
          Add entity — full implementation coming soon.
        </p>
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="mt-4 text-sm underline underline-offset-4 text-muted-foreground hover:text-foreground"
        >
          Close
        </button>
      </div>
    </div>
  )
}

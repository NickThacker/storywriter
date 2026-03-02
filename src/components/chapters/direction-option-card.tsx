'use client'

import { cn } from '@/lib/utils'
import type { DirectionOption } from '@/types/project-memory'

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

interface DirectionOptionCardProps {
  option: DirectionOption
  isSelected: boolean
  onSelect: (optionId: string) => void
}

// ──────────────────────────────────────────────────────────────────────────────
// DirectionOptionCard — a selectable card for a single AI-generated direction
// ──────────────────────────────────────────────────────────────────────────────

export function DirectionOptionCard({ option, isSelected, onSelect }: DirectionOptionCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(option.id)}
      className={cn(
        'w-full text-left rounded-lg border px-4 py-3 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        isSelected
          ? 'border-primary/60 bg-primary/5 ring-2 ring-primary/30'
          : 'border-border bg-card hover:border-border/80 hover:bg-muted/40'
      )}
    >
      {/* Title — one-sentence hook */}
      <p className="text-sm font-semibold leading-snug text-foreground">{option.title}</p>

      {/* Body — 3-4 sentence description */}
      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{option.body}</p>
    </button>
  )
}

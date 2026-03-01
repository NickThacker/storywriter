'use client'

import { useState, useTransition, useRef } from 'react'
import { Pencil, Check, X, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { upsertWorldFact, deleteWorldFact } from '@/actions/story-bible'
import type { WorldFactRow, WorldFactCategory } from '@/types/database'

interface WorldFactsListProps {
  facts: WorldFactRow[]
  projectId: string
  filterCategory?: WorldFactCategory
}

const CATEGORY_LABELS: Record<WorldFactCategory, string> = {
  timeline: 'Timeline',
  rule: 'Rule',
  lore: 'Lore',
  relationship: 'Relationship',
}

const CATEGORY_BADGE_VARIANT: Record<
  WorldFactCategory,
  'default' | 'secondary' | 'outline' | 'destructive'
> = {
  timeline: 'default',
  rule: 'destructive',
  lore: 'secondary',
  relationship: 'outline',
}

interface FactItemProps {
  fact: WorldFactRow
  projectId: string
}

function FactItem({ fact, projectId }: FactItemProps) {
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(fact.fact)
  const [isSaving, startSaveTransition] = useTransition()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isDeleting, startDeleteTransition] = useTransition()
  const inputRef = useRef<HTMLTextAreaElement>(null)

  function handleStartEdit() {
    setEditing(true)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  function handleSave() {
    if (!editValue.trim()) {
      toast.error('Fact text cannot be empty')
      return
    }
    startSaveTransition(async () => {
      const result = await upsertWorldFact(projectId, {
        id: fact.id,
        category: fact.category,
        fact: editValue.trim(),
      })
      if ('error' in result) {
        toast.error(`Failed to save: ${result.error}`)
        return
      }
      setEditing(false)
    })
  }

  function handleCancel() {
    setEditValue(fact.fact)
    setEditing(false)
  }

  function handleDelete() {
    startDeleteTransition(async () => {
      const result = await deleteWorldFact(fact.id)
      if ('error' in result) {
        toast.error(`Failed to delete: ${result.error}`)
        return
      }
      setDeleteDialogOpen(false)
    })
  }

  return (
    <>
      <div className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors group">
        <div className="shrink-0 mt-0.5">
          <Badge variant={CATEGORY_BADGE_VARIANT[fact.category]} className="text-xs">
            {CATEGORY_LABELS[fact.category]}
          </Badge>
        </div>

        <div className="flex-1 min-w-0">
          {editing ? (
            <textarea
              ref={inputRef}
              className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none min-h-[60px]"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  handleSave()
                }
                if (e.key === 'Escape') {
                  handleCancel()
                }
              }}
            />
          ) : (
            <p className="text-sm">{fact.fact}</p>
          )}
        </div>

        <div className="shrink-0 flex items-center gap-1">
          {editing ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={handleSave}
                disabled={isSaving}
                aria-label="Save"
              >
                <Check className="h-4 w-4 text-green-600" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={handleCancel}
                disabled={isSaving}
                aria-label="Cancel"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={handleStartEdit}
                aria-label="Edit fact"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                onClick={() => setDeleteDialogOpen(true)}
                aria-label="Delete fact"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </div>
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete World Fact</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this{' '}
              {CATEGORY_LABELS[fact.category].toLowerCase()}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export function WorldFactsList({ facts, projectId, filterCategory }: WorldFactsListProps) {
  if (facts.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        {filterCategory === 'timeline'
          ? 'No timeline events yet. Add key moments in your story world.'
          : 'No world facts yet. Add rules, lore, or relationships.'}
      </div>
    )
  }

  // Filtered view (Timeline tab)
  if (filterCategory) {
    return (
      <div className="space-y-2">
        {facts.map((fact, index) => (
          <div key={fact.id} className="flex items-start gap-3">
            {/* Sequence indicator for timeline */}
            <div className="shrink-0 flex flex-col items-center">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                {index + 1}
              </div>
              {index < facts.length - 1 && (
                <div className="w-px h-full min-h-[8px] bg-border mt-1" />
              )}
            </div>
            <div className="flex-1 pb-2">
              <FactItem fact={fact} projectId={projectId} />
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Grouped view (World Facts tab)
  const categories = [...new Set(facts.map((f) => f.category))] as WorldFactCategory[]
  return (
    <div className="space-y-6">
      {categories.map((category) => {
        const categoryFacts = facts.filter((f) => f.category === category)
        return (
          <div key={category}>
            <h3 className="text-sm font-medium text-muted-foreground mb-2 uppercase tracking-wide">
              {CATEGORY_LABELS[category]}
            </h3>
            <div className="space-y-2">
              {categoryFacts.map((fact) => (
                <FactItem key={fact.id} fact={fact} projectId={projectId} />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

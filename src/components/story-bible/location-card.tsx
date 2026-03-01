'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useDebouncedCallback } from 'use-debounce'
import { CheckCircle, ChevronDown, ChevronUp, Loader2, Trash2 } from 'lucide-react'
import { useTransition, useCallback } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { upsertLocation, deleteLocation } from '@/actions/story-bible'
import type { LocationRow } from '@/types/database'

const locationSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  significance: z.string().optional(),
})

type LocationFormValues = z.infer<typeof locationSchema>

interface LocationCardProps {
  location: LocationRow
  projectId: string
}

type SaveStatus = 'idle' | 'saving' | 'saved'

export function LocationCard({ location, projectId }: LocationCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isDeleting, startDeleteTransition] = useTransition()

  const {
    register,
    watch,
    formState: { errors },
  } = useForm<LocationFormValues>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      name: location.name,
      description: location.description ?? '',
      significance: location.significance ?? '',
    },
  })

  const debouncedSave = useDebouncedCallback(
    useCallback(
      async (values: LocationFormValues) => {
        setSaveStatus('saving')
        const result = await upsertLocation(projectId, {
          id: location.id,
          ...values,
        })
        if ('error' in result) {
          toast.error(`Failed to save: ${result.error}`)
          setSaveStatus('idle')
          return
        }
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 2000)
      },
      [projectId, location.id]
    ),
    600
  )

  function handleFieldChange() {
    const values = {
      name: watch('name'),
      description: watch('description'),
      significance: watch('significance'),
    }
    debouncedSave(values)
  }

  function handleDelete() {
    startDeleteTransition(async () => {
      const result = await deleteLocation(location.id)
      if ('error' in result) {
        toast.error(`Failed to delete: ${result.error}`)
        return
      }
      setDeleteDialogOpen(false)
    })
  }

  return (
    <>
      <Card className="transition-shadow hover:shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm leading-snug truncate">{location.name}</p>
              {location.description && !expanded && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {location.description}
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0 h-7 w-7 p-0"
              onClick={() => setExpanded((v) => !v)}
              aria-label={expanded ? 'Collapse location' : 'Expand location'}
            >
              {expanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>

        {expanded && (
          <CardContent className="pt-0 border-t mt-2">
            <div className="pt-3 space-y-4">
              {/* Save status indicator */}
              <div className="flex items-center justify-end h-5">
                {saveStatus === 'saving' && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Saving...
                  </span>
                )}
                {saveStatus === 'saved' && (
                  <span className="flex items-center gap-1 text-xs text-green-600">
                    <CheckCircle className="h-3 w-3" />
                    Saved
                  </span>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor={`loc-name-${location.id}`}>Name</Label>
                <Input
                  id={`loc-name-${location.id}`}
                  {...register('name')}
                  onChange={handleFieldChange}
                />
                {errors.name && (
                  <p className="text-xs text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor={`loc-desc-${location.id}`}>Description</Label>
                <textarea
                  id={`loc-desc-${location.id}`}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                  placeholder="Describe this location..."
                  {...register('description')}
                  onChange={handleFieldChange}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor={`loc-sig-${location.id}`}>Significance</Label>
                <textarea
                  id={`loc-sig-${location.id}`}
                  className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                  placeholder="Why does this location matter to the story?"
                  {...register('significance')}
                  onChange={handleFieldChange}
                />
              </div>

              <div className="pt-2 border-t">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete Location
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Location</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{location.name}&rdquo;? This action cannot be
              undone.
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

'use client'

import { useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { upsertCharacter, upsertLocation, upsertWorldFact } from '@/actions/story-bible'

const characterSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  role: z.enum(['protagonist', 'antagonist', 'supporting', 'minor']),
  one_line: z.string().optional(),
})

const locationSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
})

const worldFactSchema = z.object({
  category: z.enum(['timeline', 'rule', 'lore', 'relationship']),
  fact: z.string().min(1, 'Fact text is required'),
})

type CharacterFormValues = z.infer<typeof characterSchema>
type LocationFormValues = z.infer<typeof locationSchema>
type WorldFactFormValues = z.infer<typeof worldFactSchema>

interface AddEntityDialogProps {
  projectId: string
  entityType: 'character' | 'location' | 'world-fact'
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
}

function AddCharacterForm({
  projectId,
  onCreated,
  onCancel,
}: {
  projectId: string
  onCreated: () => void
  onCancel: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CharacterFormValues>({
    resolver: zodResolver(characterSchema),
    defaultValues: { name: '', role: 'supporting', one_line: '' },
  })
  const roleValue = watch('role')

  function onSubmit(values: CharacterFormValues) {
    startTransition(async () => {
      const result = await upsertCharacter(projectId, {
        name: values.name,
        role: values.role,
        one_line: values.one_line ?? null,
        source: 'manual',
      })
      if ('error' in result) {
        toast.error(`Failed to create character: ${result.error}`)
        return
      }
      onCreated()
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="add-char-name">Name *</Label>
        <Input id="add-char-name" placeholder="Character name" autoFocus {...register('name')} />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="add-char-role">Role</Label>
        <Select
          value={roleValue}
          onValueChange={(value) => setValue('role', value as CharacterFormValues['role'])}
        >
          <SelectTrigger id="add-char-role">
            <SelectValue placeholder="Select role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="protagonist">Protagonist</SelectItem>
            <SelectItem value="antagonist">Antagonist</SelectItem>
            <SelectItem value="supporting">Supporting</SelectItem>
            <SelectItem value="minor">Minor</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="add-char-summary">One-line summary</Label>
        <Input id="add-char-summary" placeholder="A brief description..." {...register('one_line')} />
      </div>
      <DialogFooter className="gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
          {isPending ? 'Creating...' : 'Add Character'}
        </Button>
      </DialogFooter>
    </form>
  )
}

function AddLocationForm({
  projectId,
  onCreated,
  onCancel,
}: {
  projectId: string
  onCreated: () => void
  onCancel: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LocationFormValues>({
    resolver: zodResolver(locationSchema),
    defaultValues: { name: '', description: '' },
  })

  function onSubmit(values: LocationFormValues) {
    startTransition(async () => {
      const result = await upsertLocation(projectId, {
        name: values.name,
        description: values.description ?? null,
      })
      if ('error' in result) {
        toast.error(`Failed to create location: ${result.error}`)
        return
      }
      onCreated()
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="add-loc-name">Name *</Label>
        <Input id="add-loc-name" placeholder="Location name" autoFocus {...register('name')} />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="add-loc-desc">Description</Label>
        <textarea
          id="add-loc-desc"
          className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
          placeholder="Describe this location..."
          {...register('description')}
        />
      </div>
      <DialogFooter className="gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
          {isPending ? 'Creating...' : 'Add Location'}
        </Button>
      </DialogFooter>
    </form>
  )
}

function AddWorldFactForm({
  projectId,
  onCreated,
  onCancel,
}: {
  projectId: string
  onCreated: () => void
  onCancel: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<WorldFactFormValues>({
    resolver: zodResolver(worldFactSchema),
    defaultValues: { category: 'lore', fact: '' },
  })
  const categoryValue = watch('category')

  function onSubmit(values: WorldFactFormValues) {
    startTransition(async () => {
      const result = await upsertWorldFact(projectId, {
        category: values.category,
        fact: values.fact,
      })
      if ('error' in result) {
        toast.error(`Failed to create world fact: ${result.error}`)
        return
      }
      onCreated()
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="add-fact-category">Category</Label>
        <Select
          value={categoryValue}
          onValueChange={(value) =>
            setValue('category', value as WorldFactFormValues['category'])
          }
        >
          <SelectTrigger id="add-fact-category">
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="timeline">Timeline</SelectItem>
            <SelectItem value="rule">Rule</SelectItem>
            <SelectItem value="lore">Lore</SelectItem>
            <SelectItem value="relationship">Relationship</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="add-fact-text">Fact *</Label>
        <textarea
          id="add-fact-text"
          className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
          placeholder="Describe this world fact..."
          autoFocus
          {...register('fact')}
        />
        {errors.fact && <p className="text-xs text-destructive">{errors.fact.message}</p>}
      </div>
      <DialogFooter className="gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
          {isPending ? 'Creating...' : 'Add Fact'}
        </Button>
      </DialogFooter>
    </form>
  )
}

const DIALOG_CONFIG = {
  character: {
    title: 'Add Character',
    description: 'Create a new character for your story bible.',
  },
  location: {
    title: 'Add Location',
    description: 'Add a new location to your story world.',
  },
  'world-fact': {
    title: 'Add World Fact',
    description: 'Record a rule, lore detail, timeline event, or relationship.',
  },
}

export function AddEntityDialog({
  projectId,
  entityType,
  open,
  onOpenChange,
  onCreated,
}: AddEntityDialogProps) {
  const config = DIALOG_CONFIG[entityType]

  function handleCreated() {
    onCreated()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{config.title}</DialogTitle>
          <DialogDescription>{config.description}</DialogDescription>
        </DialogHeader>
        {entityType === 'character' && (
          <AddCharacterForm
            projectId={projectId}
            onCreated={handleCreated}
            onCancel={() => onOpenChange(false)}
          />
        )}
        {entityType === 'location' && (
          <AddLocationForm
            projectId={projectId}
            onCreated={handleCreated}
            onCancel={() => onOpenChange(false)}
          />
        )}
        {entityType === 'world-fact' && (
          <AddWorldFactForm
            projectId={projectId}
            onCreated={handleCreated}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

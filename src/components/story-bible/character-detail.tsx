'use client'

import { useState, useTransition, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useDebouncedCallback } from 'use-debounce'
import { CheckCircle, Loader2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { upsertCharacter, deleteCharacter } from '@/actions/story-bible'
import type { CharacterRow, CharacterRole } from '@/types/database'

const characterSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  role: z.enum(['protagonist', 'antagonist', 'supporting', 'minor']),
  one_line: z.string().optional(),
  appearance: z.string().optional(),
  backstory: z.string().optional(),
  personality: z.string().optional(),
  voice: z.string().optional(),
  motivations: z.string().optional(),
  arc: z.string().optional(),
})

type CharacterFormValues = z.infer<typeof characterSchema>

interface CharacterDetailProps {
  character: CharacterRow
  projectId: string
  onSave: () => void
  onDelete: () => void
}

type SaveStatus = 'idle' | 'saving' | 'saved'

const ROLE_OPTIONS: { value: CharacterRole; label: string }[] = [
  { value: 'protagonist', label: 'Protagonist' },
  { value: 'antagonist', label: 'Antagonist' },
  { value: 'supporting', label: 'Supporting' },
  { value: 'minor', label: 'Minor' },
]

export function CharacterDetail({ character, projectId, onSave, onDelete }: CharacterDetailProps) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isDeleting, startDeleteTransition] = useTransition()

  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CharacterFormValues>({
    resolver: zodResolver(characterSchema),
    defaultValues: {
      name: character.name,
      role: character.role,
      one_line: character.one_line ?? '',
      appearance: character.appearance ?? '',
      backstory: character.backstory ?? '',
      personality: character.personality ?? '',
      voice: character.voice ?? '',
      motivations: character.motivations ?? '',
      arc: character.arc ?? '',
    },
  })

  const roleValue = watch('role')

  const debouncedSave = useDebouncedCallback(
    useCallback(
      async (values: CharacterFormValues) => {
        setSaveStatus('saving')
        const result = await upsertCharacter(projectId, {
          id: character.id,
          ...values,
        })
        if ('error' in result) {
          toast.error(`Failed to save: ${result.error}`)
          setSaveStatus('idle')
          return
        }
        setSaveStatus('saved')
        onSave()
        setTimeout(() => setSaveStatus('idle'), 2000)
      },
      [projectId, character.id, onSave]
    ),
    600
  )

  function handleFieldChange(field: keyof CharacterFormValues, value: string) {
    setValue(field, value as CharacterRole)
    const currentValues = {
      name: watch('name'),
      role: watch('role'),
      one_line: watch('one_line'),
      appearance: watch('appearance'),
      backstory: watch('backstory'),
      personality: watch('personality'),
      voice: watch('voice'),
      motivations: watch('motivations'),
      arc: watch('arc'),
      [field]: value,
    }
    debouncedSave(currentValues as CharacterFormValues)
  }

  function handleDelete() {
    startDeleteTransition(async () => {
      const result = await deleteCharacter(character.id)
      if ('error' in result) {
        toast.error(`Failed to delete: ${result.error}`)
        return
      }
      setDeleteDialogOpen(false)
      onDelete()
    })
  }

  return (
    <div className="space-y-4">
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

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Name */}
        <div className="space-y-1.5">
          <Label htmlFor={`name-${character.id}`}>Name</Label>
          <Input
            id={`name-${character.id}`}
            {...register('name')}
            onChange={(e) => handleFieldChange('name', e.target.value)}
          />
          {errors.name && (
            <p className="text-xs text-destructive">{errors.name.message}</p>
          )}
        </div>

        {/* Role */}
        <div className="space-y-1.5">
          <Label>Role</Label>
          <Select
            value={roleValue}
            onValueChange={(value) => handleFieldChange('role', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              {ROLE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* One-line summary */}
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor={`one_line-${character.id}`}>One-line summary</Label>
          <Input
            id={`one_line-${character.id}`}
            placeholder="A brief description of this character..."
            {...register('one_line')}
            onChange={(e) => handleFieldChange('one_line', e.target.value)}
          />
        </div>
      </div>

      {/* Textarea fields */}
      {(
        [
          { field: 'appearance', label: 'Appearance' },
          { field: 'backstory', label: 'Backstory' },
          { field: 'personality', label: 'Personality' },
          { field: 'voice', label: 'Voice', placeholder: 'How does this character speak?' },
          { field: 'motivations', label: 'Motivations' },
          { field: 'arc', label: 'Character Arc', placeholder: 'How does this character change?' },
        ] as { field: keyof CharacterFormValues; label: string; placeholder?: string }[]
      ).map(({ field, label, placeholder }) => (
        <div key={field} className="space-y-1.5">
          <Label htmlFor={`${field}-${character.id}`}>{label}</Label>
          <textarea
            id={`${field}-${character.id}`}
            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
            placeholder={placeholder}
            {...register(field)}
            onChange={(e) => handleFieldChange(field, e.target.value)}
          />
        </div>
      ))}

      {/* Delete button */}
      <div className="pt-2 border-t">
        <Button
          variant="destructive"
          size="sm"
          onClick={() => setDeleteDialogOpen(true)}
        >
          <Trash2 className="h-4 w-4 mr-1" />
          Delete Character
        </Button>
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Character</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{character.name}&rdquo;? This action cannot be
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
    </div>
  )
}

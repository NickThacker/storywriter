'use client'

import { useState, useCallback } from 'react'
import { useDebouncedCallback } from 'use-debounce'
import { Check, Loader2 } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { saveModelPreferences } from '@/actions/settings'
import { TASK_TYPES, AVAILABLE_MODELS, RECOMMENDED_MODELS } from '@/lib/models'
import type { TaskType } from '@/types/database'
import { toast } from 'sonner'

interface ModelSelectorProps {
  initialPreferences: { taskType: string; modelId: string }[]
}

type SaveStatus = 'idle' | 'saving' | 'saved'

const PROVIDERS = [...new Set(AVAILABLE_MODELS.map((m) => m.provider))]

function getModelName(modelId: string): string {
  return AVAILABLE_MODELS.find((m) => m.id === modelId)?.name ?? modelId
}

function isRecommended(taskType: TaskType, modelId: string): boolean {
  return RECOMMENDED_MODELS[taskType]?.id === modelId
}

export function ModelSelector({ initialPreferences }: ModelSelectorProps) {
  const [preferences, setPreferences] = useState<Record<TaskType, string>>(() => {
    const prefMap = new Map(initialPreferences.map((p) => [p.taskType, p.modelId]))
    const taskTypes = TASK_TYPES.map((t) => t.value)
    return Object.fromEntries(
      taskTypes.map((t) => [t, prefMap.get(t) ?? RECOMMENDED_MODELS[t].id])
    ) as Record<TaskType, string>
  })

  const [saveStatus, setSaveStatus] = useState<Record<TaskType, SaveStatus>>(
    () => Object.fromEntries(TASK_TYPES.map((t) => [t.value, 'idle'])) as Record<TaskType, SaveStatus>
  )

  const debouncedSave = useDebouncedCallback(
    useCallback(async (taskType: TaskType, modelId: string) => {
      setSaveStatus((prev) => ({ ...prev, [taskType]: 'saving' }))

      const result = await saveModelPreferences([{ taskType, modelId }])

      if ('error' in result) {
        toast.error(`Failed to save ${taskType} model: ${result.error}`)
        setSaveStatus((prev) => ({ ...prev, [taskType]: 'idle' }))
        return
      }

      setSaveStatus((prev) => ({ ...prev, [taskType]: 'saved' }))

      setTimeout(() => {
        setSaveStatus((prev) => ({ ...prev, [taskType]: 'idle' }))
      }, 2000)
    }, []),
    600
  )

  function handleModelChange(taskType: TaskType, modelId: string) {
    setPreferences((prev) => ({ ...prev, [taskType]: modelId }))
    debouncedSave(taskType, modelId)
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Choose which AI model powers each writing task. Changes auto-save.
      </p>

      <div className="space-y-0 divide-y divide-border">
        {TASK_TYPES.map(({ value: taskType, label, description }) => {
          const selectedModelId = preferences[taskType]
          const status = saveStatus[taskType]
          const recommended = isRecommended(taskType, selectedModelId)

          return (
            <div key={taskType} className="py-5 first:pt-0 last:pb-0">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-foreground">{label}</p>
                    {recommended && (
                      <span
                        className="text-[0.6rem] uppercase tracking-[0.08em] px-1.5 py-0.5 border border-border"
                        style={{ borderRadius: 0 }}
                      >
                        Recommended
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[0.7rem] text-muted-foreground">{description}</p>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  {status === 'saving' && (
                    <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                  )}
                  {status === 'saved' && (
                    <Check className="h-3 w-3" style={{ color: 'var(--gold)' }} />
                  )}

                  <Select
                    value={selectedModelId}
                    onValueChange={(value) => handleModelChange(taskType, value)}
                  >
                    <SelectTrigger
                      className="w-[240px] text-xs"
                      style={{ borderRadius: 0 }}
                    >
                      <SelectValue placeholder="Select a model" />
                    </SelectTrigger>
                    <SelectContent style={{ borderRadius: 0 }}>
                      {PROVIDERS.map((provider) => (
                        <SelectGroup key={provider}>
                          <SelectLabel className="text-[0.6rem] uppercase tracking-[0.08em]">{provider}</SelectLabel>
                          {AVAILABLE_MODELS.filter((m) => m.provider === provider).map((model) => (
                            <SelectItem key={model.id} value={model.id} className="text-xs">
                              {model.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

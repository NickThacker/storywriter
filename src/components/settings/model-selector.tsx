'use client'

import { useState, useCallback } from 'react'
import { useDebouncedCallback } from 'use-debounce'
import { CheckCircle, Loader2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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

// Group models by provider for the dropdown
const PROVIDERS = [...new Set(AVAILABLE_MODELS.map((m) => m.provider))]

function getModelName(modelId: string): string {
  return AVAILABLE_MODELS.find((m) => m.id === modelId)?.name ?? modelId
}

function isRecommended(taskType: TaskType, modelId: string): boolean {
  return RECOMMENDED_MODELS[taskType]?.id === modelId
}

export function ModelSelector({ initialPreferences }: ModelSelectorProps) {
  // Initialize state from props, defaulting to RECOMMENDED_MODELS
  const [preferences, setPreferences] = useState<Record<TaskType, string>>(() => {
    const prefMap = new Map(initialPreferences.map((p) => [p.taskType, p.modelId]))
    const taskTypes: TaskType[] = ['outline', 'prose', 'editing']
    return Object.fromEntries(
      taskTypes.map((t) => [t, prefMap.get(t) ?? RECOMMENDED_MODELS[t].id])
    ) as Record<TaskType, string>
  })

  const [saveStatus, setSaveStatus] = useState<Record<TaskType, SaveStatus>>({
    outline: 'idle',
    prose: 'idle',
    editing: 'idle',
  })

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

      // Reset "saved" indicator after 2 seconds
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
    <Card>
      <CardHeader>
        <CardTitle>Model Preferences</CardTitle>
        <CardDescription>
          Choose which AI model powers each writing task. Changes auto-save as you select.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {TASK_TYPES.map(({ value: taskType, label, description }) => {
          const selectedModelId = preferences[taskType]
          const status = saveStatus[taskType]
          const recommended = isRecommended(taskType, selectedModelId)

          return (
            <div key={taskType} className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium leading-none">{label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{description}</p>
                </div>

                {/* Save status indicator */}
                <div className="ml-4 flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
                  {status === 'saving' && (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Saving...
                    </>
                  )}
                  {status === 'saved' && (
                    <>
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      <span className="text-green-600">Saved</span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Select
                  value={selectedModelId}
                  onValueChange={(value) => handleModelChange(taskType, value)}
                >
                  <SelectTrigger className="w-[260px]">
                    <SelectValue placeholder="Select a model" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROVIDERS.map((provider) => (
                      <SelectGroup key={provider}>
                        <SelectLabel>{provider}</SelectLabel>
                        {AVAILABLE_MODELS.filter((m) => m.provider === provider).map((model) => (
                          <SelectItem key={model.id} value={model.id}>
                            {model.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>

                {recommended && (
                  <Badge variant="secondary" className="text-xs">
                    Recommended
                  </Badge>
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                Currently: <span className="font-medium">{getModelName(selectedModelId)}</span>
              </p>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

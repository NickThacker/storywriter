'use client'

import { CardPicker } from '@/components/intake/card-picker'
import { useIntakeStore } from '@/components/intake/intake-store-provider'
import { SETTINGS } from '@/lib/data/settings'

export function SettingStep() {
  const setting = useIntakeStore((s) => s.setting)
  const setSetting = useIntakeStore((s) => s.setSetting)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          Where does your story take place?
        </h2>
        <p className="mt-1 text-muted-foreground">
          Choose the setting that best fits your story&apos;s world.
        </p>
      </div>

      <CardPicker
        options={SETTINGS}
        selected={setting ?? ''}
        onSelect={setSetting}
        columns={3}
      />
    </div>
  )
}

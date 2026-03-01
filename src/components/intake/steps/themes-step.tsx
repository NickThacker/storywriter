'use client'

import { CardPicker } from '@/components/intake/card-picker'
import { useIntakeStore } from '@/components/intake/intake-store-provider'
import { THEMES } from '@/lib/data/themes'

const MAX_THEMES = 3

export function ThemesStep() {
  const themes = useIntakeStore((s) => s.themes)
  const setThemes = useIntakeStore((s) => s.setThemes)

  const toggleTheme = (id: string) => {
    if (themes.includes(id)) {
      // Deselect
      setThemes(themes.filter((t) => t !== id))
    } else if (themes.length < MAX_THEMES) {
      // Select (only if under limit)
      setThemes([...themes, id])
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          What themes will drive your story?
        </h2>
        <p className="mt-1 text-muted-foreground">
          Select up to 3 themes that resonate with your story.
        </p>
      </div>

      {/* Selection count indicator */}
      <div className="flex items-center gap-2">
        <div className="flex gap-1.5">
          {Array.from({ length: MAX_THEMES }).map((_, i) => (
            <div
              key={i}
              className={`h-2 w-8 rounded-full transition-colors ${
                i < themes.length ? 'bg-primary' : 'bg-border'
              }`}
              aria-hidden="true"
            />
          ))}
        </div>
        <span className="text-sm text-muted-foreground">
          {themes.length} of {MAX_THEMES} selected
        </span>
      </div>

      <CardPicker
        options={THEMES}
        selected={themes}
        multiSelect
        onSelect={toggleTheme}
        columns={3}
      />
    </div>
  )
}

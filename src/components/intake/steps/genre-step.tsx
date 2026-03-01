'use client'

import { CardPicker } from '@/components/intake/card-picker'
import { useIntakeStore } from '@/components/intake/intake-store-provider'
import { GENRES } from '@/lib/data/genres'

export function GenreStep() {
  const genre = useIntakeStore((s) => s.genre)
  const setGenre = useIntakeStore((s) => s.setGenre)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          What genre is your novel?
        </h2>
        <p className="mt-1 text-muted-foreground">
          Choose the genre that best fits the story you want to tell.
        </p>
      </div>

      <CardPicker
        options={GENRES}
        selected={genre ?? ''}
        onSelect={setGenre}
        columns={3}
      />
    </div>
  )
}

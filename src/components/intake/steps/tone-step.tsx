'use client'

import { CardPicker } from '@/components/intake/card-picker'
import { useIntakeStore } from '@/components/intake/intake-store-provider'
import { TONES } from '@/lib/data/tones'
import { BEAT_SHEETS } from '@/lib/data/beat-sheets'
import { LENGTH_PRESETS } from '@/lib/data/lengths'
import type { BeatSheetId } from '@/lib/stores/intake-store'

export function ToneStep() {
  const tone = useIntakeStore((s) => s.tone)
  const beatSheet = useIntakeStore((s) => s.beatSheet)
  const targetLength = useIntakeStore((s) => s.targetLength)
  const chapterCount = useIntakeStore((s) => s.chapterCount)
  const setTone = useIntakeStore((s) => s.setTone)
  const setBeatSheet = useIntakeStore((s) => s.setBeatSheet)
  const setTargetLength = useIntakeStore((s) => s.setTargetLength)
  const setChapterCount = useIntakeStore((s) => s.setChapterCount)

  const beatSheetOptions = BEAT_SHEETS.map((bs) => ({
    id: bs.id,
    label: bs.name,
    description: bs.description,
  }))

  const lengthOptions = LENGTH_PRESETS.map((lp) => ({
    id: lp.id,
    label: lp.label,
    description: lp.description,
  }))

  const handleLengthSelect = (id: string) => {
    const preset = LENGTH_PRESETS.find((lp) => lp.id === id)
    if (preset) {
      setTargetLength(id as typeof LENGTH_PRESETS[number]['id'], preset.defaultChapters)
    }
  }

  return (
    <div className="flex flex-col gap-10">
      {/* Section 1: Tone */}
      <section>
        <div className="mb-4">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Style &amp; Structure
          </h2>
          <p className="mt-1 text-muted-foreground">
            Define the feel and framework of your story.
          </p>
        </div>

        <div className="mb-6">
          <h3 className="mb-3 text-base font-semibold text-foreground">
            What&apos;s the tone?
          </h3>
          <CardPicker
            options={TONES}
            selected={tone ?? ''}
            onSelect={setTone}
            columns={2}
          />
        </div>

        {/* Section 2: Beat Sheet */}
        <div className="mb-6">
          <h3 className="mb-1 text-base font-semibold text-foreground">
            Story structure
          </h3>
          <p className="mb-3 text-sm text-muted-foreground">
            Which narrative framework should guide your plot?
          </p>
          <CardPicker
            options={beatSheetOptions}
            selected={beatSheet ?? ''}
            onSelect={(id) => setBeatSheet(id as BeatSheetId)}
            columns={2}
          />
        </div>

        {/* Section 3: Target Length */}
        <div>
          <h3 className="mb-1 text-base font-semibold text-foreground">
            Target length
          </h3>
          <p className="mb-3 text-sm text-muted-foreground">
            How long should your novel be?
          </p>
          <CardPicker
            options={lengthOptions}
            selected={targetLength}
            onSelect={handleLengthSelect}
            columns={3}
          />

          {/* Custom chapter count */}
          <div className="mt-4 flex items-center gap-3">
            <label
              htmlFor="chapter-count"
              className="text-sm font-medium text-foreground whitespace-nowrap"
            >
              Chapters:
            </label>
            <input
              id="chapter-count"
              type="number"
              min={1}
              max={200}
              value={chapterCount}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10)
                if (!isNaN(val) && val > 0) setChapterCount(val)
              }}
              className="w-24 rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <span className="text-sm text-muted-foreground">
              (adjust to fine-tune)
            </span>
          </div>
        </div>
      </section>
    </div>
  )
}

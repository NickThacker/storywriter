'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import type { IntakeData } from '@/lib/validations/intake'

type RegenerateLevel = 'full' | 'directed' | 'chapter'

interface RegenerateDialogProps {
  projectId: string
  intakeData: IntakeData
  selectedChapterIndex?: number
  open: boolean
  onOpenChange: (open: boolean) => void
  onRegenerate: (level: RegenerateLevel, direction?: string) => void
}

export function RegenerateDialog({
  selectedChapterIndex,
  open,
  onOpenChange,
  onRegenerate,
}: RegenerateDialogProps) {
  const [activeTab, setActiveTab] = useState<RegenerateLevel>('full')
  const [directedText, setDirectedText] = useState('')
  const [chapterDirectionText, setChapterDirectionText] = useState('')

  const chapterNumber =
    selectedChapterIndex !== undefined ? selectedChapterIndex + 1 : null

  function handleRegenerate() {
    if (activeTab === 'full') {
      onRegenerate('full')
    } else if (activeTab === 'directed') {
      onRegenerate('directed', directedText)
    } else if (activeTab === 'chapter') {
      onRegenerate('chapter', chapterDirectionText || undefined)
    }
    onOpenChange(false)
  }

  const isActionDisabled =
    activeTab === 'directed' && directedText.trim().length === 0

  const tabs: { id: RegenerateLevel; label: string }[] = [
    { id: 'full', label: 'Start Fresh' },
    { id: 'directed', label: 'Guided Regenerate' },
    ...(chapterNumber !== null
      ? [{ id: 'chapter' as const, label: 'Redo This Chapter' }]
      : []),
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Regenerate Outline</DialogTitle>
          <DialogDescription>
            Choose how you&apos;d like to regenerate your outline.
          </DialogDescription>
        </DialogHeader>

        {/* Tab bar */}
        <div className="flex border-b gap-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={[
                'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              ].join(' ')}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="py-2 space-y-4">
          {activeTab === 'full' && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Regenerates the entire outline from your original intake data.
                Use this to start completely fresh with new structure and chapter
                ideas.
              </p>
            </div>
          )}

          {activeTab === 'directed' && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Regenerate with your feedback. The AI uses your original intake
                data plus your direction to create an improved outline.
              </p>
              <textarea
                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                placeholder={`Make act 2 more tense, Add a subplot about...`}
                value={directedText}
                onChange={(e) => setDirectedText(e.target.value)}
                autoFocus
              />
              {directedText.trim().length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Enter your direction to enable regeneration.
                </p>
              )}
            </div>
          )}

          {activeTab === 'chapter' && chapterNumber !== null && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Regenerate just Chapter {chapterNumber} without affecting the
                rest of your outline. Optionally provide specific direction for
                this chapter.
              </p>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                placeholder="Optional: Give specific direction for this chapter..."
                value={chapterDirectionText}
                onChange={(e) => setChapterDirectionText(e.target.value)}
              />
            </div>
          )}

          {/* Warning */}
          <div className="rounded-md bg-muted px-3 py-2">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Note:</span> This
              will replace your current outline. Your previous version will be
              saved automatically.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleRegenerate} disabled={isActionDisabled}>
            {activeTab === 'full' && 'Regenerate Outline'}
            {activeTab === 'directed' && 'Regenerate with Direction'}
            {activeTab === 'chapter' && `Regenerate Chapter ${chapterNumber}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

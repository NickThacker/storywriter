'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useVoiceWizardStore } from '@/components/onboarding/onboarding-store-provider'
import { ChevronRight, X, Upload, FileText } from 'lucide-react'
import { toast } from 'sonner'

export function WritingSamplesStep() {
  const pastedSamples = useVoiceWizardStore((s) => s.pastedSamples)
  const uploadedFileTexts = useVoiceWizardStore((s) => s.uploadedFileTexts)
  const addPastedSample = useVoiceWizardStore((s) => s.addPastedSample)
  const removePastedSample = useVoiceWizardStore((s) => s.removePastedSample)
  const addUploadedFileText = useVoiceWizardStore((s) => s.addUploadedFileText)
  const removeUploadedFileText = useVoiceWizardStore((s) => s.removeUploadedFileText)
  const nextStep = useVoiceWizardStore((s) => s.nextStep)

  const [draft, setDraft] = useState('')
  const [uploadedFileNames, setUploadedFileNames] = useState<string[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const totalSamples = pastedSamples.length + uploadedFileTexts.length
  const canProceed = totalSamples > 0

  function handleAddSample() {
    const trimmed = draft.trim()
    if (!trimmed) return
    addPastedSample(trimmed)
    setDraft('')
  }

  function handleRemoveUpload(index: number) {
    removeUploadedFileText(index)
    setUploadedFileNames((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = e.target.files?.[0]
    if (!file) return

    const accepted = ['.pdf', '.docx', '.txt']
    const ext = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!accepted.includes(ext)) {
      toast.error(`Unsupported file type: ${ext}. Please upload PDF, DOCX, or TXT.`)
      e.target.value = ''
      return
    }

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/voice-upload', { method: 'POST', body: formData })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        toast.error(body.error ?? 'Upload failed. Please try again.')
        return
      }
      const { text } = await res.json()
      addUploadedFileText(text)
      setUploadedFileNames((prev) => [...prev, file.name])
    } catch {
      toast.error('Upload failed. Please check your connection and try again.')
    } finally {
      setIsUploading(false)
      e.target.value = ''
    }
  }

  return (
    <div className="space-y-6">
      {/* Paste section */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold">Paste a writing sample</h2>
        <p className="text-xs text-muted-foreground">
          Add one or more excerpts from your existing writing (chapters, short stories, blog posts).
        </p>
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Paste a passage from your writing here..."
          className="min-h-[160px] resize-y font-mono text-sm"
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{draft.length.toLocaleString()} characters</span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddSample}
            disabled={!draft.trim()}
          >
            Add Sample
          </Button>
        </div>
      </div>

      {/* Pasted samples list */}
      {pastedSamples.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Pasted samples ({pastedSamples.length})
          </p>
          {pastedSamples.map((sample, i) => (
            <div
              key={i}
              className="flex items-start gap-2 rounded-lg border bg-muted/30 p-3"
            >
              <FileText className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
              <p className="flex-1 text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                {sample}
              </p>
              <button
                type="button"
                onClick={() => removePastedSample(i)}
                aria-label="Remove sample"
                className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* File upload section */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold">Or upload a file</h2>
        <p className="text-xs text-muted-foreground">Supported formats: PDF, DOCX, TXT</p>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.txt"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            <Upload className="h-4 w-4 mr-1.5" />
            {isUploading ? 'Uploading...' : 'Upload file'}
          </Button>
        </div>
      </div>

      {/* Uploaded files list */}
      {uploadedFileTexts.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Uploaded files ({uploadedFileTexts.length})
          </p>
          {uploadedFileTexts.map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2"
            >
              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="flex-1 text-sm text-muted-foreground truncate">
                {uploadedFileNames[i] ?? `Uploaded file ${i + 1}`}
              </span>
              <button
                type="button"
                onClick={() => handleRemoveUpload(i)}
                aria-label="Remove file"
                className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Total count */}
      {totalSamples > 0 && (
        <p className="text-sm text-muted-foreground">
          {totalSamples} sample{totalSamples !== 1 ? 's' : ''} added
        </p>
      )}

      {/* Nav */}
      <div className="flex items-center justify-end border-t border-border pt-4">
        <Button
          onClick={nextStep}
          disabled={!canProceed}
          className="gap-1"
        >
          Analyze My Writing
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

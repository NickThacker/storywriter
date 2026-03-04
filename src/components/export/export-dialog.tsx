'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

type ExportFormat = 'docx' | 'epub' | 'rtf' | 'txt'
type IncludeMode = 'approved' | 'all'

interface ExportDialogProps {
  projectId: string
  projectTitle: string
  userName: string
}

interface FormatOption {
  value: ExportFormat
  label: string
  ext: string
  description: string
}

interface IncludeOption {
  value: IncludeMode
  label: string
  description: string
}

// ──────────────────────────────────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────────────────────────────────

const FORMAT_OPTIONS: FormatOption[] = [
  { value: 'docx', label: 'DOCX', ext: '.docx', description: 'Microsoft Word format' },
  { value: 'epub', label: 'ePub', ext: '.epub', description: 'E-reader format' },
  { value: 'rtf', label: 'RTF', ext: '.rtf', description: 'Rich text, compatible with Vellum' },
  { value: 'txt', label: 'Plain Text', ext: '.txt', description: 'Simple text file' },
]

const INCLUDE_OPTIONS: IncludeOption[] = [
  { value: 'approved', label: 'Approved chapters only', description: '' },
  { value: 'all', label: 'All chapters', description: 'Drafts marked as [DRAFT]' },
]

// ──────────────────────────────────────────────────────────────────────────────
// ExportDialog
// ──────────────────────────────────────────────────────────────────────────────

export function ExportDialog({ projectId, projectTitle: _projectTitle, userName }: ExportDialogProps) {
  const [open, setOpen] = useState(false)
  const [format, setFormat] = useState<ExportFormat>('docx')
  const [include, setInclude] = useState<IncludeMode>('approved')
  const [penName, setPenName] = useState(userName)
  const [loading, setLoading] = useState(false)

  function handleOpenChange(next: boolean) {
    if (!next) {
      // Reset to defaults on close (pen name retains last value for convenience)
      setFormat('docx')
      setInclude('approved')
    }
    setOpen(next)
  }

  async function handleExport() {
    if (loading) return
    setLoading(true)

    try {
      const url = `/api/export/${projectId}?format=${format}&include=${include}&penName=${encodeURIComponent(penName.trim() || 'Author')}`

      // Use anchor-based download to trigger browser file download
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = ''
      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)

      // Close the dialog after triggering
      setOpen(false)
    } finally {
      setLoading(false)
    }
  }

  const selectedFormat = FORMAT_OPTIONS.find((f) => f.value === format)
  const downloadLabel = loading ? 'Downloading...' : `Download ${selectedFormat?.label ?? ''}`

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4" />
          Export
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export Novel</DialogTitle>
          <DialogDescription>
            Download your novel as a formatted document.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* ── Format selector */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Format
            </p>
            <div className="grid grid-cols-2 gap-2">
              {FORMAT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFormat(opt.value)}
                  className={cn(
                    'rounded-lg border px-3 py-2.5 text-left transition-colors',
                    format === opt.value
                      ? 'border-primary/60 bg-primary/10 text-foreground ring-1 ring-primary/30'
                      : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <div className="text-sm font-medium">
                    {opt.label}
                    <span className="ml-1 text-xs opacity-60">{opt.ext}</span>
                  </div>
                  <div className="mt-0.5 text-xs opacity-70">{opt.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* ── Chapter filter */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Chapters to Include
            </p>
            <div className="space-y-1.5">
              {INCLUDE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setInclude(opt.value)}
                  className={cn(
                    'w-full rounded-lg border px-3 py-2 text-left transition-colors',
                    include === opt.value
                      ? 'border-primary/60 bg-primary/10 text-foreground ring-1 ring-primary/30'
                      : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <span className="text-sm font-medium">{opt.label}</span>
                  {opt.description && (
                    <span className="ml-1.5 text-xs opacity-60">{opt.description}</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* ── Pen name */}
          <div className="space-y-1.5">
            <label
              htmlFor="export-pen-name"
              className="text-xs font-medium text-muted-foreground uppercase tracking-wider"
            >
              Pen Name
            </label>
            <input
              id="export-pen-name"
              type="text"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder="Author Name"
              value={penName}
              onChange={(e) => setPenName(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={loading}>
            <Download className="h-4 w-4" />
            {downloadLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

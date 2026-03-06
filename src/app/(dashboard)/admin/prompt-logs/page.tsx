'use client'

import { useState, useEffect, useCallback } from 'react'
import { ChevronDown, RefreshCw, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Message {
  role: string
  content: string
}

interface PromptLog {
  id: string
  created_at: string
  route: string
  model: string
  messages: Message[]
  char_count: number
}

// ── Route badge config ────────────────────────────────────────────────────────

const ROUTES: Record<string, { label: string; className: string }> = {
  'outline':           { label: 'Outline',          className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' },
  'chapter':           { label: 'Chapter',          className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  'voice-analysis':    { label: 'Voice Analysis',   className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  'compress-chapter':  { label: 'Compress',         className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  'direction-options': { label: 'Directions',       className: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
  'analyze-impact':    { label: 'Impact',           className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300' },
  'premise-prefill':   { label: 'Premise Prefill',  className: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300' },
}

function RouteBadge({ route }: { route: string }) {
  const cfg = ROUTES[route] ?? { label: route, className: 'bg-muted text-muted-foreground' }
  return (
    <span className={cn('inline-flex items-center rounded px-2 py-0.5 text-xs font-medium', cfg.className)}>
      {cfg.label}
    </span>
  )
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return new Date(iso).toLocaleDateString()
}

// ── Single log entry ──────────────────────────────────────────────────────────

function LogEntry({ log }: { log: PromptLog }) {
  const [open, setOpen] = useState(false)

  const systemMsg = log.messages.find((m) => m.role === 'system')
  const userMsg = log.messages.find((m) => m.role === 'user')
  const shortModel = log.model.includes('/') ? log.model.split('/').pop() : log.model

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      {/* Header row */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-card hover:bg-muted/30 text-left transition-colors"
      >
        <RouteBadge route={log.route} />
        <span className="text-xs text-muted-foreground font-mono flex-1 truncate">{shortModel}</span>
        <span className="text-xs text-muted-foreground tabular-nums shrink-0">
          ~{Math.round(log.char_count / 4).toLocaleString()} tokens
        </span>
        <span className="text-xs text-muted-foreground shrink-0 hidden sm:block">
          {relativeTime(log.created_at)}
        </span>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-150',
            open && 'rotate-180'
          )}
        />
      </button>

      {/* Expanded messages */}
      {open && (
        <div className="border-t border-border divide-y divide-border">
          {systemMsg && (
            <MessageBlock label="SYSTEM" content={systemMsg.content} />
          )}
          {userMsg && (
            <MessageBlock label="USER" content={userMsg.content} />
          )}
          {log.messages.filter((m) => m.role !== 'system' && m.role !== 'user').map((m, i) => (
            <MessageBlock key={i} label={m.role.toUpperCase()} content={m.content} />
          ))}
        </div>
      )}
    </div>
  )
}

function MessageBlock({ label, content }: { label: string; content: string }) {
  return (
    <div className="bg-muted/10 px-4 py-3 space-y-1.5">
      <p className="text-[10px] font-bold tracking-widest text-muted-foreground">{label}</p>
      <pre className="text-xs font-mono whitespace-pre-wrap leading-relaxed text-foreground bg-background border border-border rounded-md p-3 max-h-72 overflow-y-auto">
        {content}
      </pre>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PromptLogsPage() {
  const [logs, setLogs] = useState<PromptLog[]>([])
  const [isLive, setIsLive] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [clearing, setClearing] = useState(false)

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/prompt-logs')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as { logs: PromptLog[] }
      setLogs(data.logs)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch logs')
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial load
  useEffect(() => { void fetchLogs() }, [fetchLogs])

  // Live polling
  useEffect(() => {
    if (!isLive) return
    const id = setInterval(() => { void fetchLogs() }, 4000)
    return () => clearInterval(id)
  }, [isLive, fetchLogs])

  async function handleClear() {
    if (!confirm('Delete all prompt logs?')) return
    setClearing(true)
    try {
      await fetch('/api/admin/prompt-logs', { method: 'DELETE' })
      setLogs([])
    } finally {
      setClearing(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Prompt Log</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Full context sent to OpenRouter for every generation call. Last 100 entries.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Live toggle */}
          <button
            onClick={() => setIsLive(!isLive)}
            className={cn(
              'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
              isLive
                ? 'border-green-500 bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400'
                : 'border-border text-muted-foreground hover:text-foreground'
            )}
          >
            <span
              className={cn(
                'h-1.5 w-1.5 rounded-full',
                isLive ? 'bg-green-500 animate-pulse' : 'bg-muted-foreground'
              )}
            />
            {isLive ? 'Live' : 'Paused'}
          </button>

          {/* Manual refresh */}
          <Button variant="ghost" size="icon" onClick={() => void fetchLogs()} className="h-8 w-8">
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>

          {/* Clear */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => void handleClear()}
            disabled={clearing || logs.length === 0}
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Stats bar */}
      {logs.length > 0 && (
        <div className="flex items-center gap-4 text-xs text-muted-foreground border-b border-border pb-3">
          <span>{logs.length} entries</span>
          <span>
            ~{Math.round(logs.reduce((sum, l) => sum + l.char_count, 0) / 4).toLocaleString()} total tokens
          </span>
          <span className="ml-auto">
            {Object.entries(
              logs.reduce<Record<string, number>>((acc, l) => {
                acc[l.route] = (acc[l.route] ?? 0) + 1
                return acc
              }, {})
            )
              .sort((a, b) => b[1] - a[1])
              .map(([route, count]) => `${ROUTES[route]?.label ?? route}: ${count}`)
              .join('  ·  ')}
          </span>
        </div>
      )}

      {/* States */}
      {loading && (
        <p className="text-sm text-muted-foreground">Loading...</p>
      )}
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {!loading && !error && logs.length === 0 && (
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">No logs yet.</p>
          <p className="text-xs text-muted-foreground mt-1">
            Generate an outline, chapter, or voice analysis to see the full prompt context here.
          </p>
        </div>
      )}

      {/* Log list */}
      <div className="space-y-2">
        {logs.map((log) => (
          <LogEntry key={log.id} log={log} />
        ))}
      </div>
    </div>
  )
}

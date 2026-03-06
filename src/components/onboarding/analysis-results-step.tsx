'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Download, LayoutDashboard, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { useVoiceWizardStore } from '@/components/onboarding/onboarding-store-provider'
import { savePersona } from '@/actions/voice'
import type { VoiceAnalysisResult } from '@/lib/voice/schema'
import type { StyleDescriptors, ThematicPreferences } from '@/types/database'

// ── Partial JSON parser for voice analysis ───────────────────────────────────

interface PartialVoiceResult {
  voice_description?: string
  style_descriptors?: Record<string, string>
  thematic_preferences?: Record<string, string>
  raw_guidance_text?: string
  data_observations?: Record<string, string>
}

function parsePartialVoiceJSON(raw: string): PartialVoiceResult | null {
  if (!raw.trim()) return null
  try {
    return JSON.parse(raw) as PartialVoiceResult
  } catch {
    // ignore
  }

  const cutPoints: number[] = []
  let inStr = false
  let esc = false
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i]
    if (esc) { esc = false; continue }
    if (ch === '\\' && inStr) { esc = true; continue }
    if (ch === '"') { inStr = !inStr; continue }
    if (inStr) continue
    if (ch === '}' || ch === ']') cutPoints.push(i + 1)
  }

  for (let t = cutPoints.length - 1; t >= 0; t--) {
    const slice = raw.slice(0, cutPoints[t])
    let braces = 0
    let brackets = 0
    let s = false
    let e = false
    for (let i = 0; i < slice.length; i++) {
      const c = slice[i]
      if (e) { e = false; continue }
      if (c === '\\' && s) { e = true; continue }
      if (c === '"') { s = !s; continue }
      if (s) continue
      if (c === '{') braces++
      else if (c === '}') braces--
      else if (c === '[') brackets++
      else if (c === ']') brackets--
    }
    let closed = slice
    for (let i = 0; i < brackets; i++) closed += ']'
    for (let i = 0; i < braces; i++) closed += '}'
    try {
      return JSON.parse(closed) as PartialVoiceResult
    } catch {
      // next
    }
  }
  return null
}

// ── Rotating waiting messages ─────────────────────────────────────────────────

const WAITING_MESSAGES = [
  'Reading your prose rhythms...',
  'Tracing sentence structure patterns...',
  'Listening for your narrative voice...',
  'Mapping your stylistic fingerprints...',
  'Weighing your pacing instincts...',
  'Studying how you handle dialogue...',
  'Noting your relationship with punctuation...',
  'Watching for recurring imagery...',
  'Calibrating your diction register...',
  'Feeling the weight of your paragraphs...',
  'Charting your narrative distance...',
  'Observing your chapter-level momentum...',
  'Listening for the things only you do...',
  'Assembling the portrait of your voice...',
]

function useRotatingMessage(active: boolean, intervalMs = 3000): string {
  const [index, setIndex] = useState(() => Math.floor(Math.random() * WAITING_MESSAGES.length))
  const usedRef = useRef<Set<number>>(new Set([index]))

  useEffect(() => {
    if (!active) return
    const id = setInterval(() => {
      setIndex((prev) => {
        if (usedRef.current.size >= WAITING_MESSAGES.length) {
          usedRef.current = new Set([prev])
        }
        let next: number
        do {
          next = Math.floor(Math.random() * WAITING_MESSAGES.length)
        } while (usedRef.current.has(next))
        usedRef.current.add(next)
        return next
      })
    }, intervalMs)
    return () => clearInterval(id)
  }, [active, intervalMs])

  return WAITING_MESSAGES[index]
}

// ── Completion modal ──────────────────────────────────────────────────────────

function CompletionModal({ open }: { open: boolean }) {
  const router = useRouter()

  function handleDownloadPdf() {
    const anchor = document.createElement('a')
    anchor.href = '/api/voice-report'
    anchor.download = 'voice-report.pdf'
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
  }

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="flex items-center justify-center mb-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
          </div>
          <DialogTitle className="text-center text-lg">Your Voice DNA Profile is ready</DialogTitle>
          <DialogDescription className="text-center">
            StoryWriter has captured your writing voice. Your style will now be used to match your prose across all generated chapters.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 pt-2">
          <Button onClick={handleDownloadPdf} variant="outline" className="w-full gap-2">
            <Download className="h-4 w-4" />
            Download PDF Report
          </Button>
          <Button onClick={() => router.push('/dashboard')} className="w-full gap-2">
            <LayoutDashboard className="h-4 w-4" />
            Go to Dashboard
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Main step component ───────────────────────────────────────────────────────

export function AnalysisResultsStep() {
  const pastedSamples = useVoiceWizardStore((s) => s.pastedSamples)
  const uploadedFileTexts = useVoiceWizardStore((s) => s.uploadedFileTexts)
  const analysisComplete = useVoiceWizardStore((s) => s.analysisComplete)
  const setAnalysisResult = useVoiceWizardStore((s) => s.setAnalysisResult)
  const prevStep = useVoiceWizardStore((s) => s.prevStep)

  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [partial, setPartial] = useState<PartialVoiceResult | null>(null)

  const waitingMessage = useRotatingMessage(isStreaming && !partial?.voice_description)

  const hasFiredRef = useRef(false)

  async function runAnalysis() {
    if (hasFiredRef.current) return
    hasFiredRef.current = true

    setIsStreaming(true)
    setError(null)
    setPartial(null)

    const samples = [...pastedSamples, ...uploadedFileTexts]

    try {
      const res = await fetch('/api/voice-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ samples, preferences: {} }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `Request failed: ${res.status}`)
      }

      if (!res.body) throw new Error('No response body')

      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader()
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const lines = value.split('\n')
        for (const line of lines) {
          if (line.startsWith(': ') || !line.startsWith('data: ')) continue
          const dataStr = line.slice('data: '.length).trim()
          if (!dataStr || dataStr === '[DONE]') continue
          try {
            const parsed = JSON.parse(dataStr) as { choices?: { delta?: { content?: string } }[] }
            const content = parsed.choices?.[0]?.delta?.content
            if (content) {
              accumulated += content
              const partialParsed = parsePartialVoiceJSON(accumulated)
              if (partialParsed) setPartial(partialParsed)
            }
          } catch {
            // skip malformed SSE chunks
          }
        }
      }

      const finalParsed = parsePartialVoiceJSON(accumulated)
      if (finalParsed && finalParsed.voice_description) {
        const result = finalParsed as VoiceAnalysisResult
        const legacyStyleDescriptors = (result.style_descriptors ?? {}) as Record<string, string>
        const legacyThematicPrefs = (result.thematic_preferences ?? {}) as Record<string, string>
        setAnalysisResult({
          voiceDescription: result.voice_description ?? '',
          styleDescriptors: legacyStyleDescriptors,
          thematicPreferences: legacyThematicPrefs,
          rawGuidanceText: result.raw_guidance_text ?? '',
        })
        await savePersona({
          voice_description: result.voice_description,
          style_descriptors: result as unknown as StyleDescriptors,
          thematic_preferences: legacyThematicPrefs as unknown as ThematicPreferences,
          raw_guidance_text: result.raw_guidance_text ?? '',
          analysis_complete: true,
          wizard_step: 2,
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed. Please try again.')
    } finally {
      setIsStreaming(false)
    }
  }

  useEffect(() => {
    if (analysisComplete) return
    void runAnalysis()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleRetry() {
    hasFiredRef.current = false
    void runAnalysis()
  }

  // ── Error state
  if (error) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-2">
          <p className="text-sm font-medium text-destructive">Analysis failed</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
        <div className="flex items-center justify-between border-t border-border pt-4">
          <Button variant="ghost" onClick={prevStep} className="gap-1">
            Back
          </Button>
          <Button onClick={handleRetry} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  // ── Streaming / loading state (and complete — modal handles completion UI)
  return (
    <>
      <CompletionModal open={analysisComplete} />

      <div className="space-y-4">
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-primary shrink-0" />
            <div>
              <p className="text-sm font-semibold">Analyzing your writing style...</p>
              <p className="text-xs text-muted-foreground">This may take 30–60 seconds.</p>
            </div>
          </div>

          {partial?.voice_description && (
            <div className="rounded-md bg-muted/40 p-3 space-y-1">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                Voice description
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {partial.voice_description}
                {isStreaming && (
                  <span className="inline-block w-1.5 h-3.5 bg-primary ml-0.5 animate-pulse align-[-2px]" />
                )}
              </p>
            </div>
          )}

          {!partial?.voice_description && (
            <div className="flex items-center gap-2">
              <span className="inline-flex gap-1 shrink-0">
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" />
              </span>
              <span className="text-xs text-muted-foreground transition-all duration-500">{waitingMessage}</span>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

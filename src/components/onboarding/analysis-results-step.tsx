'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Download, LayoutDashboard } from 'lucide-react'
import { Button } from '@/components/ui/button'
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

// ── Descriptor grid ───────────────────────────────────────────────────────────

function DescriptorGrid({ title, data }: { title: string; data: Record<string, string> }) {
  const entries = Object.entries(data)
  if (entries.length === 0) return null
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {entries.map(([key, value]) => (
          <div key={key} className="rounded-lg border bg-muted/30 p-3 space-y-0.5">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              {key.replace(/_/g, ' ')}
            </p>
            <p className="text-sm text-foreground leading-snug">{value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main step component ───────────────────────────────────────────────────────

export function AnalysisResultsStep() {
  const router = useRouter()

  const pastedSamples = useVoiceWizardStore((s) => s.pastedSamples)
  const uploadedFileTexts = useVoiceWizardStore((s) => s.uploadedFileTexts)
  const tonePreference = useVoiceWizardStore((s) => s.tonePreference)
  const pacingPreference = useVoiceWizardStore((s) => s.pacingPreference)
  const dialogueRatio = useVoiceWizardStore((s) => s.dialogueRatio)
  const darkLightTheme = useVoiceWizardStore((s) => s.darkLightTheme)
  const povPreference = useVoiceWizardStore((s) => s.povPreference)
  const dictionLevel = useVoiceWizardStore((s) => s.dictionLevel)
  const analysisComplete = useVoiceWizardStore((s) => s.analysisComplete)
  const voiceDescription = useVoiceWizardStore((s) => s.voiceDescription)
  const styleDescriptors = useVoiceWizardStore((s) => s.styleDescriptors)
  const thematicPreferences = useVoiceWizardStore((s) => s.thematicPreferences)
  const setAnalysisResult = useVoiceWizardStore((s) => s.setAnalysisResult)
  const prevStep = useVoiceWizardStore((s) => s.prevStep)

  const [isStreaming, setIsStreaming] = useState(false)
  const [streamedText, setStreamedText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [partial, setPartial] = useState<PartialVoiceResult | null>(null)

  const hasFiredRef = useRef(false)

  async function runAnalysis() {
    if (hasFiredRef.current) return
    hasFiredRef.current = true

    setIsStreaming(true)
    setStreamedText('')
    setError(null)
    setPartial(null)

    const samples = [...pastedSamples, ...uploadedFileTexts]
    const preferences = {
      tonePreference,
      pacingPreference,
      dialogueRatio,
      darkLightTheme,
      povPreference,
      dictionLevel,
    }

    try {
      const res = await fetch('/api/voice-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ samples, preferences }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `Request failed: ${res.status}`)
      }

      if (!res.body) throw new Error('No response body')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        accumulated += chunk
        setStreamedText(accumulated)
        const parsed = parsePartialVoiceJSON(accumulated)
        if (parsed) setPartial(parsed)
      }

      // Attempt final parse
      const finalParsed = parsePartialVoiceJSON(accumulated)
      if (finalParsed && finalParsed.voice_description) {
        const result = finalParsed as VoiceAnalysisResult
        const rawStyleDescriptors = (result.style_descriptors ?? {}) as Record<string, string>
        const rawThematicPreferences = (result.thematic_preferences ?? {}) as Record<string, string>
        const mapped = {
          voiceDescription: result.voice_description ?? '',
          styleDescriptors: rawStyleDescriptors,
          thematicPreferences: rawThematicPreferences,
          rawGuidanceText: result.raw_guidance_text ?? '',
        }
        setAnalysisResult(mapped)
        await savePersona({
          voice_description: mapped.voiceDescription,
          style_descriptors: rawStyleDescriptors as unknown as StyleDescriptors,
          thematic_preferences: rawThematicPreferences as unknown as ThematicPreferences,
          raw_guidance_text: mapped.rawGuidanceText,
          analysis_complete: true,
          wizard_step: 3,
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed. Please try again.')
    } finally {
      setIsStreaming(false)
    }
  }

  // Fire on mount — only once
  useEffect(() => {
    // If already complete from a previous run in the same session, skip
    if (analysisComplete) return
    void runAnalysis()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleRetry() {
    hasFiredRef.current = false
    void runAnalysis()
  }

  function handleDownloadPdf() {
    const anchor = document.createElement('a')
    anchor.href = '/api/voice-report'
    anchor.download = 'voice-report.pdf'
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
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

  // ── Results state (complete)
  if (analysisComplete && voiceDescription) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg border bg-card p-4 space-y-2">
          <h3 className="text-sm font-semibold">Your Voice</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{voiceDescription}</p>
        </div>

        {styleDescriptors && Object.keys(styleDescriptors).length > 0 && (
          <DescriptorGrid title="Style Descriptors" data={styleDescriptors} />
        )}

        {thematicPreferences && Object.keys(thematicPreferences).length > 0 && (
          <DescriptorGrid title="Thematic Preferences" data={thematicPreferences} />
        )}

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center border-t border-border pt-4">
          <Button onClick={handleDownloadPdf} variant="outline" className="gap-1.5">
            <Download className="h-4 w-4" />
            Download PDF Report
          </Button>
          <Button onClick={() => router.push('/dashboard')} className="gap-1.5">
            <LayoutDashboard className="h-4 w-4" />
            Go to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  // ── Streaming / loading state
  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-primary shrink-0" />
          <div>
            <p className="text-sm font-semibold">Analyzing your writing style...</p>
            <p className="text-xs text-muted-foreground">This may take 30–60 seconds.</p>
          </div>
        </div>

        {/* Progressive reveal of voice_description as it streams */}
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

        {/* Raw buffer indicator while no structured data yet */}
        {!partial?.voice_description && streamedText.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="inline-flex gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" />
            </span>
            <span className="text-xs text-muted-foreground">Building analysis...</span>
          </div>
        )}
      </div>
    </div>
  )
}

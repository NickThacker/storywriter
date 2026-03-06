'use client'

import { useEffect, useRef, useMemo, useState, useCallback } from 'react'
import { Loader2, BookOpen, MapPin, Users, ChevronDown } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface PartialChapter {
  number?: number
  title?: string
  summary?: string
  beats?: string[]
  characters_featured?: string[]
  beat_sheet_mapping?: string
  act?: number
}

interface PartialOutline {
  title?: string
  premise?: string
  chapters?: PartialChapter[]
  characters?: { name?: string; role?: string; one_line?: string }[]
  locations?: { name?: string; description?: string }[]
}

function parsePartialJSON(raw: string): PartialOutline | null {
  if (!raw.trim()) return null
  try {
    return JSON.parse(raw) as PartialOutline
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
    let braces = 0, brackets = 0, s = false, e = false
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
      return JSON.parse(closed) as PartialOutline
    } catch {
      // next
    }
  }
  return null
}

const ACT_COLORS: Record<number, string> = {
  1: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
  2: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  3: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
}

type Tab = 'chapters' | 'characters' | 'locations'

// ─── Collapsible chapter card ───────────────────────────────────────────────

function ChapterCard({
  ch,
  index,
  isBuilding,
  defaultExpanded,
}: {
  ch: PartialChapter
  index: number
  isBuilding: boolean
  defaultExpanded: boolean
}) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  // Auto-expand when this becomes the building card
  useEffect(() => {
    if (isBuilding) setExpanded(true)
  }, [isBuilding])

  // Auto-collapse when a new card takes over as "building"
  useEffect(() => {
    if (!isBuilding && defaultExpanded) setExpanded(false)
  }, [isBuilding, defaultExpanded])

  const actColor = ACT_COLORS[ch.act ?? 1] ?? ACT_COLORS[1]

  return (
    <div
      className={`rounded-lg border transition-all ${
        isBuilding ? 'border-primary/40 bg-primary/[0.02]' : 'bg-card'
      }`}
    >
      {/* Beat sheet mapping banner — shown when beat is assigned */}
      {ch.beat_sheet_mapping && (
        <div className={`px-4 py-1.5 text-[11px] font-medium rounded-t-lg border-b ${actColor}`}>
          {ch.beat_sheet_mapping}
        </div>
      )}

      {/* Collapsed / header row — always visible, clickable */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-3 w-full text-left px-4 py-3 hover:bg-muted/30 transition-colors rounded-lg"
      >
        <span className="text-xs font-mono text-muted-foreground shrink-0 w-6 text-right">
          {ch.number ?? index + 1}
        </span>
        <span className="font-semibold text-sm text-foreground flex-1 truncate">
          {ch.title || 'Untitled'}
          {isBuilding && !ch.summary && (
            <span className="inline-block w-1.5 h-3.5 bg-primary ml-1 animate-pulse align-[-2px]" />
          )}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          {ch.act && (
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${actColor}`}>
              Act {ch.act}
            </Badge>
          )}
          <ChevronDown
            className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${
              expanded ? 'rotate-180' : ''
            }`}
          />
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-5 pt-0 pl-[3.25rem] space-y-2">
          {ch.summary && (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {ch.summary}
              {isBuilding && (!ch.beats || ch.beats.length === 0) && (
                <span className="inline-block w-1.5 h-3 bg-primary ml-0.5 animate-pulse align-[-1px]" />
              )}
            </p>
          )}

          {ch.beats && ch.beats.length > 0 && (
            <ul className="space-y-0.5 mt-1">
              {ch.beats.map((beat, bi) => (
                <li key={bi} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <span className="text-primary/60 mt-px shrink-0">-</span>
                  <span>{beat}</span>
                </li>
              ))}
              {isBuilding && (
                <li className="flex items-start gap-2 text-xs">
                  <span className="inline-block w-1.5 h-3 bg-primary animate-pulse" />
                </li>
              )}
            </ul>
          )}

          {ch.characters_featured && ch.characters_featured.length > 0 && (
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <Users className="h-3 w-3 text-muted-foreground/60" />
              {ch.characters_featured.map((name, ci) => (
                <span key={ci} className="text-[11px] text-muted-foreground">
                  {name}{ci < ch.characters_featured!.length - 1 ? ',' : ''}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main streaming view ────────────────────────────────────────────────────

interface StreamingViewProps {
  streamedContent: string
  isStreaming: boolean
  error: string | null
  onRetry?: () => void
}

export function StreamingView({
  streamedContent,
  isStreaming,
  error,
  onRetry,
}: StreamingViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [lastGoodParse, setLastGoodParse] = useState<PartialOutline | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('chapters')

  const latestParse = useMemo(() => parsePartialJSON(streamedContent), [streamedContent])

  useEffect(() => {
    if (latestParse) setLastGoodParse(latestParse)
  }, [latestParse])

  const partial = latestParse ?? lastGoodParse

  // Auto-scroll within active tab
  useEffect(() => {
    if (scrollRef.current && activeTab === 'chapters') {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [streamedContent, activeTab])

  // Track previous chapter count to auto-collapse
  const prevChapterCount = useRef(0)
  const chapters = useMemo(() => partial?.chapters?.filter(Boolean) ?? [], [partial])
  const characters = useMemo(() => partial?.characters?.filter(Boolean) ?? [], [partial])
  const locations = useMemo(() => partial?.locations?.filter(Boolean) ?? [], [partial])

  useEffect(() => {
    prevChapterCount.current = chapters.length
  }, [chapters.length])

  const tabCounts: Record<Tab, number> = {
    chapters: chapters.length,
    characters: characters.length,
    locations: locations.length,
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 p-8">
        <div className="text-center space-y-2">
          <p className="text-destructive font-medium">Generation Failed</p>
          <p className="text-muted-foreground text-sm">{error}</p>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="text-sm text-primary underline-offset-4 hover:underline"
          >
            Try again
          </button>
        )}
      </div>
    )
  }

  const hasTitle = !!partial?.title

  return (
    <div className="flex flex-col h-full min-h-[500px]">
      {/* Header with title/premise */}
      <div className="px-6 py-4 border-b space-y-2">
        <div className="flex items-center gap-3">
          {isStreaming && <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />}
          <div className="flex-1 min-w-0">
            {hasTitle ? (
              <h2 className="text-lg font-bold tracking-tight truncate">{partial!.title}</h2>
            ) : (
              <h2 className="text-base font-semibold">
                {isStreaming ? 'Generating your outline...' : 'Outline complete'}
              </h2>
            )}
          </div>
          {isStreaming && (
            <span className="inline-flex gap-1 shrink-0">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" />
            </span>
          )}
        </div>
        {partial?.premise && (
          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
            {partial.premise}
          </p>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b px-6">
        {(['chapters', 'characters', 'locations'] as Tab[]).map((tab) => {
          const Icon = tab === 'chapters' ? BookOpen : tab === 'characters' ? Users : MapPin
          const count = tabCounts[tab]
          const isActive = activeTab === tab
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                isActive
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="capitalize">{tab}</span>
              {count > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  isActive ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                }`}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {!partial && !streamedContent ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-sm text-muted-foreground">Waiting for response...</p>
          </div>
        ) : !partial ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-sm text-muted-foreground">Reading response...</p>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto px-6 py-8">
            {/* Chapters tab */}
            {activeTab === 'chapters' && (
              <div className="space-y-2">
                {chapters.length === 0 && isStreaming && (
                  <div className="flex items-center justify-center h-24">
                    <p className="text-sm text-muted-foreground">Building chapters...</p>
                  </div>
                )}
                {chapters.map((ch, i) => (
                  <ChapterCard
                    key={ch.number ?? i}
                    ch={ch}
                    index={i}
                    isBuilding={isStreaming && i === chapters.length - 1}
                    defaultExpanded={i === chapters.length - 1}
                  />
                ))}
                {isStreaming && chapters.length > 0 && <div className="h-4" />}
              </div>
            )}

            {/* Characters tab */}
            {activeTab === 'characters' && (
              <div className="space-y-2">
                {characters.length === 0 ? (
                  <div className="flex items-center justify-center h-24">
                    <p className="text-sm text-muted-foreground">
                      {isStreaming ? 'Characters will appear after chapters...' : 'No characters found'}
                    </p>
                  </div>
                ) : (
                  characters.filter(Boolean).map((ch, i) => (
                    <div key={i} className="rounded-lg border bg-card p-4 pb-5 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{ch.name}</span>
                        {ch.role && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize">
                            {ch.role}
                          </Badge>
                        )}
                      </div>
                      {ch.one_line && (
                        <p className="text-sm text-muted-foreground">{ch.one_line}</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Locations tab */}
            {activeTab === 'locations' && (
              <div className="space-y-2">
                {locations.length === 0 ? (
                  <div className="flex items-center justify-center h-24">
                    <p className="text-sm text-muted-foreground">
                      {isStreaming ? 'Locations will appear after chapters...' : 'No locations found'}
                    </p>
                  </div>
                ) : (
                  locations.filter(Boolean).map((loc, i) => (
                    <div key={i} className="rounded-lg border bg-card p-4 pb-5 space-y-1">
                      <span className="font-semibold text-sm">{loc.name}</span>
                      {loc.description && (
                        <p className="text-sm text-muted-foreground">{loc.description}</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

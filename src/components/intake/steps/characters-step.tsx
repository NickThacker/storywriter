'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  User,
  Plus,
  Sparkles,
  X,
  ChevronDown,
  ChevronUp,
  Wand2,
  Users,
  Loader2,
  AlertTriangle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useIntakeStore } from '@/components/intake/intake-store-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { IntakeCharacter } from '@/lib/stores/intake-store'

type LoadingAction = 'suggest-names' | `flesh-out-${number}` | 'suggest-cast' | null

export function CharactersStep() {
  const characters = useIntakeStore((s) => s.characters)
  const addCharacter = useIntakeStore((s) => s.addCharacter)
  const removeCharacter = useIntakeStore((s) => s.removeCharacter)
  const updateCharacter = useIntakeStore((s) => s.updateCharacter)
  const setCharacters = useIntakeStore((s) => s.setCharacters)
  const genre = useIntakeStore((s) => s.genre)
  const setting = useIntakeStore((s) => s.setting)
  const tone = useIntakeStore((s) => s.tone)
  const themes = useIntakeStore((s) => s.themes)

  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set())
  const [loadingAction, setLoadingAction] = useState<LoadingAction>(null)
  const [suggestedNames, setSuggestedNames] = useState<string[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [touchedNames, setTouchedNames] = useState<Set<number>>(new Set())

  // Ref for auto-focusing newly added character name inputs
  const newCardRef = useRef<HTMLInputElement | null>(null)
  const shouldFocusNew = useRef(false)

  useEffect(() => {
    if (shouldFocusNew.current && newCardRef.current) {
      newCardRef.current.focus()
      shouldFocusNew.current = false
    }
  })

  const toggleExpand = useCallback((index: number) => {
    setExpandedCards((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }, [])

  const handleAddCharacter = useCallback(() => {
    addCharacter({ name: '' })
    shouldFocusNew.current = true
  }, [addCharacter])

  const handleRemoveCharacter = useCallback(
    (index: number) => {
      removeCharacter(index)
      setExpandedCards((prev) => {
        const next = new Set<number>()
        for (const i of prev) {
          if (i < index) next.add(i)
          else if (i > index) next.add(i - 1)
        }
        return next
      })
      setTouchedNames((prev) => {
        const next = new Set<number>()
        for (const i of prev) {
          if (i < index) next.add(i)
          else if (i > index) next.add(i - 1)
        }
        return next
      })
    },
    [removeCharacter]
  )

  const callCharacterAssist = useCallback(
    async (body: Record<string, unknown>) => {
      setError(null)
      const res = await fetch('/api/generate/character-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => null)
        throw new Error(errData?.error || `Request failed (${res.status})`)
      }
      return res.json()
    },
    []
  )

  const handleSuggestNames = useCallback(async () => {
    setLoadingAction('suggest-names')
    setSuggestedNames(null)
    try {
      const data = await callCharacterAssist({
        action: 'suggest-names',
        genre,
        setting,
        tone,
        themes,
        existingCharacters: characters.map((c) => c.name),
        count: 5,
      })
      setSuggestedNames(data.names)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to suggest names')
    } finally {
      setLoadingAction(null)
    }
  }, [callCharacterAssist, genre, setting, tone, themes, characters])

  const handleFleshOut = useCallback(
    async (index: number) => {
      const char = characters[index]
      if (!char?.name.trim()) return
      setLoadingAction(`flesh-out-${index}`)
      try {
        const data = await callCharacterAssist({
          action: 'flesh-out',
          genre,
          setting,
          tone,
          themes,
          character: {
            name: char.name,
            appearance: char.appearance,
            personality: char.personality,
          },
        })
        updateCharacter(index, {
          appearance: data.appearance,
          personality: data.personality,
          backstory: data.backstory,
          arc: data.arc,
        })
        setExpandedCards((prev) => new Set([...prev, index]))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to flesh out character')
      } finally {
        setLoadingAction(null)
      }
    },
    [callCharacterAssist, characters, genre, setting, tone, themes, updateCharacter]
  )

  const handleSuggestCast = useCallback(async () => {
    setLoadingAction('suggest-cast')
    try {
      const data = await callCharacterAssist({
        action: 'suggest-cast',
        genre,
        setting,
        tone,
        themes,
        existingCharacters: characters.map((c) => c.name),
      })
      if (data.characters?.length) {
        setCharacters([...characters, ...data.characters])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to suggest cast')
    } finally {
      setLoadingAction(null)
    }
  }, [callCharacterAssist, genre, setting, tone, themes, characters, setCharacters])

  const handleAddSuggestedName = useCallback(
    (name: string) => {
      addCharacter({ name })
      setSuggestedNames((prev) => prev?.filter((n) => n !== name) ?? null)
    },
    [addCharacter]
  )

  const isLoading = loadingAction !== null

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          Who are the key players?
        </h2>
        <p className="mt-1 text-muted-foreground">
          Name your characters and optionally add details. AI can help fill in the rest.
        </p>
      </div>

      {/* Warning banner at 8+ characters */}
      {characters.length >= 8 && (
        <div className="flex items-center gap-2 rounded-lg border border-yellow-500/50 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-700 dark:text-yellow-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>Having too many characters can dilute your story. Consider focusing on fewer, deeper characters.</span>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="shrink-0 text-destructive hover:text-destructive/80"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddCharacter}
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Add Character
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleSuggestCast}
          disabled={isLoading}
        >
          {loadingAction === 'suggest-cast' ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="mr-1.5 h-4 w-4" />
          )}
          Suggest Cast
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleSuggestNames}
          disabled={isLoading}
        >
          {loadingAction === 'suggest-names' ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <Wand2 className="mr-1.5 h-4 w-4" />
          )}
          Suggest Names
        </Button>
      </div>

      {/* Suggested names panel */}
      {suggestedNames && suggestedNames.length > 0 && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
          <p className="mb-2 text-sm font-medium text-foreground">
            Suggested names — click to add:
          </p>
          <div className="flex flex-wrap gap-2">
            {suggestedNames.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => handleAddSuggestedName(name)}
                className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-background px-3 py-1 text-sm text-foreground transition-colors hover:border-primary hover:bg-primary/10"
              >
                <Plus className="h-3 w-3" />
                {name}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setSuggestedNames(null)}
            className="mt-2 text-xs text-muted-foreground hover:text-foreground"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Empty state */}
      {characters.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border py-12 text-center">
          <User className="h-10 w-10 text-muted-foreground/50" />
          <div>
            <p className="font-medium text-foreground">No characters yet</p>
            <p className="text-sm text-muted-foreground">
              Add at least one character to continue.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddCharacter}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Add Character
          </Button>
        </div>
      )}

      {/* Character cards grid */}
      {characters.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {characters.map((char, index) => {
            const isExpanded = expandedCards.has(index)
            const isFleshingOut = loadingAction === `flesh-out-${index}`
            const isTouched = touchedNames.has(index)
            const hasEmptyName = !char.name.trim()
            const isLastCard = index === characters.length - 1

            return (
              <div
                key={index}
                className="rounded-lg border border-border bg-card p-4"
              >
                {/* Card header: name input + actions */}
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <Input
                    ref={isLastCard ? newCardRef : undefined}
                    type="text"
                    placeholder="Character name"
                    value={char.name}
                    onChange={(e) => updateCharacter(index, { name: e.target.value })}
                    onBlur={() =>
                      setTouchedNames((prev) => new Set([...prev, index]))
                    }
                    className={cn(
                      'h-8 flex-1',
                      isTouched && hasEmptyName && 'border-destructive focus-visible:ring-destructive'
                    )}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleFleshOut(index)}
                    disabled={isLoading || hasEmptyName}
                    className="h-8 px-2 text-muted-foreground hover:text-primary"
                    title="Flesh out with AI"
                  >
                    {isFleshingOut ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Wand2 className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleExpand(index)}
                    className="h-8 px-2 text-muted-foreground"
                    title={isExpanded ? 'Collapse details' : 'Expand details'}
                  >
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveCharacter(index)}
                    className="h-8 px-2 text-muted-foreground hover:text-destructive"
                    title="Remove character"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Expanded details section */}
                {isExpanded && (
                  <div className="mt-3 flex flex-col gap-3 rounded-md bg-muted/30 p-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">
                        Appearance
                      </label>
                      <Textarea
                        rows={2}
                        placeholder="What do they look like? (hair, build, distinguishing features)"
                        value={char.appearance ?? ''}
                        onChange={(e) =>
                          updateCharacter(index, { appearance: e.target.value })
                        }
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">
                        Personality
                      </label>
                      <Textarea
                        rows={2}
                        placeholder="How do they act? Their voice, mannerisms, temperament"
                        value={char.personality ?? ''}
                        onChange={(e) =>
                          updateCharacter(index, { personality: e.target.value })
                        }
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">
                        Backstory
                      </label>
                      <Textarea
                        rows={2}
                        placeholder="Where did they come from? Key life events"
                        value={char.backstory ?? ''}
                        onChange={(e) =>
                          updateCharacter(index, { backstory: e.target.value })
                        }
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">
                        Arc
                      </label>
                      <Textarea
                        rows={2}
                        placeholder="How should they change over the course of the story?"
                        value={char.arc ?? ''}
                        onChange={(e) =>
                          updateCharacter(index, { arc: e.target.value })
                        }
                        className="text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Footer count */}
      {characters.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {characters.length} character{characters.length !== 1 ? 's' : ''} defined
        </p>
      )}
    </div>
  )
}

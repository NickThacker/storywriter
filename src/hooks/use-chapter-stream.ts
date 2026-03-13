'use client'

import { useState, useCallback, useRef } from 'react'
import type { ContinuityIssue } from '@/lib/memory/continuity-auditor'

export interface ContinuityConflict {
  issues: ContinuityIssue[]
  pendingProjectId: string
  pendingChapterNumber: number
  pendingAdjustments?: string
}

interface UseChapterStreamReturn {
  streamedText: string
  isStreaming: boolean
  error: string | null
  wordCount: number
  continuityConflict: ContinuityConflict | null
  clearContinuityConflict: () => void
  startStream: (projectId: string, chapterNumber: number, adjustments?: string, force?: boolean) => Promise<void>
  stop: () => void
}

/**
 * Client-side hook for consuming the chapter generation SSE stream.
 *
 * Calls /api/generate/chapter, reads SSE chunks, accumulates raw prose tokens,
 * and tracks word count live during streaming.
 *
 * Stop aborts the connection and preserves accumulated text.
 * On 409 continuity_conflict, exposes conflict data for the UI to show a dialog.
 */
export function useChapterStream(): UseChapterStreamReturn {
  const [streamedText, setStreamedText] = useState<string>('')
  const [isStreaming, setIsStreaming] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [wordCount, setWordCount] = useState<number>(0)
  const [continuityConflict, setContinuityConflict] = useState<ContinuityConflict | null>(null)

  const abortControllerRef = useRef<AbortController | null>(null)

  const clearContinuityConflict = useCallback(() => setContinuityConflict(null), [])

  const startStream = useCallback(
    async (projectId: string, chapterNumber: number, adjustments?: string, force?: boolean): Promise<void> => {
      // Abort any existing stream first (prevent ReadableStream locked error)
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
        abortControllerRef.current = null
      }

      // Reset state for new stream
      setStreamedText('')
      setError(null)
      setContinuityConflict(null)
      setIsStreaming(true)
      setWordCount(0)

      const controller = new AbortController()
      abortControllerRef.current = controller

      try {
        // 1. POST to the SSE route handler
        const response = await fetch('/api/generate/chapter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId, chapterNumber, adjustments, force }),
          signal: controller.signal,
        })

        if (!response.ok) {
          // Special handling for continuity conflicts
          if (response.status === 409) {
            try {
              const errBody = (await response.json()) as {
                code?: string
                issues?: ContinuityIssue[]
                error?: string
              }
              if (errBody.code === 'continuity_conflict' && errBody.issues) {
                setContinuityConflict({
                  issues: errBody.issues,
                  pendingProjectId: projectId,
                  pendingChapterNumber: chapterNumber,
                  pendingAdjustments: adjustments,
                })
                setIsStreaming(false)
                return
              }
            } catch {
              // fall through to generic error
            }
          }

          let errorMessage = `Generation failed (${response.status})`
          try {
            const errBody = (await response.json()) as { error?: string }
            if (errBody.error) {
              errorMessage = errBody.error
            }
          } catch {
            // ignore parse error, use default message
          }
          setError(errorMessage)
          setIsStreaming(false)
          return
        }

        if (!response.body) {
          setError('No response body from server')
          setIsStreaming(false)
          return
        }

        // 2. Pipe through TextDecoderStream and read chunks
        const reader = response.body.pipeThrough(new TextDecoderStream()).getReader()
        let accumulated = ''

        while (true) {
          const { done, value } = await reader.read()

          if (done) {
            break
          }

          // 3. Process SSE lines in this chunk
          const lines = value.split('\n')

          for (const line of lines) {
            // Skip OpenRouter heartbeat lines
            if (line.startsWith(': ')) {
              continue
            }

            // Only process data lines
            if (!line.startsWith('data: ')) {
              continue
            }

            const dataStr = line.slice('data: '.length).trim()

            // Skip the [DONE] completion signal
            if (dataStr === '[DONE]') {
              continue
            }

            // Skip empty data lines
            if (!dataStr) {
              continue
            }

            // 4. Parse the SSE JSON payload and extract content delta
            try {
              const parsed = JSON.parse(dataStr) as {
                choices?: { delta?: { content?: string } }[]
              }

              const content = parsed.choices?.[0]?.delta?.content
              if (content) {
                accumulated += content
                setStreamedText(accumulated)
                // Update live word count
                setWordCount(accumulated.trim().split(/\s+/).filter(Boolean).length)
              }
            } catch {
              // Skip partial/malformed SSE chunks — this is expected during streaming
            }
          }
        }
      } catch (err) {
        // Intentional abort (stop) — return silently
        if (err instanceof Error && err.name === 'AbortError') {
          return
        }
        const message =
          err instanceof Error ? err.message : 'An unexpected error occurred during generation'
        console.error('Chapter stream error:', err)
        setError(message)
      } finally {
        setIsStreaming(false)
      }
    },
    []
  )

  /**
   * Abort the stream. Preserves accumulated text — caller decides whether to keep it.
   */
  const stop = useCallback((): void => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setIsStreaming(false)
  }, [])

  return {
    streamedText,
    isStreaming,
    error,
    wordCount,
    continuityConflict,
    clearContinuityConflict,
    startStream,
    stop,
  }
}

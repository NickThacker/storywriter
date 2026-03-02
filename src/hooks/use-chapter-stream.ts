'use client'

import { useState, useCallback, useRef } from 'react'

interface UseChapterStreamReturn {
  streamedText: string
  isStreaming: boolean
  isPaused: boolean
  error: string | null
  wordCount: number
  startStream: (projectId: string, chapterNumber: number, adjustments?: string) => Promise<void>
  pause: () => void
  resume: () => void
  stop: () => void
}

/**
 * Client-side hook for consuming the chapter generation SSE stream.
 *
 * Calls /api/generate/chapter, reads SSE chunks, accumulates raw prose tokens,
 * and tracks word count live during streaming.
 *
 * Supports pause (abort + preserve text), stop (abort + clear state), and
 * resume (caller re-triggers startStream after pause).
 *
 * Handles:
 * - OpenAI-compatible SSE format (data: {...} lines)
 * - [DONE] completion signal
 * - OpenRouter heartbeat lines (": OPENROUTER PROCESSING")
 * - Raw prose accumulation (NOT JSON parsing — chapter output is prose)
 */
export function useChapterStream(): UseChapterStreamReturn {
  const [streamedText, setStreamedText] = useState<string>('')
  const [isStreaming, setIsStreaming] = useState<boolean>(false)
  const [isPaused, setIsPaused] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [wordCount, setWordCount] = useState<number>(0)

  const abortControllerRef = useRef<AbortController | null>(null)

  const startStream = useCallback(
    async (projectId: string, chapterNumber: number, adjustments?: string): Promise<void> => {
      // Abort any existing stream first (prevent ReadableStream locked error)
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
        abortControllerRef.current = null
      }

      // Reset state for new stream
      setStreamedText('')
      setError(null)
      setIsStreaming(true)
      setIsPaused(false)
      setWordCount(0)

      const controller = new AbortController()
      abortControllerRef.current = controller

      try {
        // 1. POST to the SSE route handler
        const response = await fetch('/api/generate/chapter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId, chapterNumber, adjustments }),
          signal: controller.signal,
        })

        if (!response.ok) {
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
        // Intentional abort (pause or stop) — return silently
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
   * Abort the stream and preserve accumulated text for display.
   * Sets isPaused true — caller should re-trigger startStream to resume.
   */
  const pause = useCallback((): void => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setIsStreaming(false)
    setIsPaused(true)
  }, [])

  /**
   * Clear the paused state. Caller is responsible for re-triggering startStream.
   */
  const resume = useCallback((): void => {
    setIsPaused(false)
  }, [])

  /**
   * Abort the stream and clear paused state.
   * Does NOT clear streamedText — caller decides whether to keep the text.
   */
  const stop = useCallback((): void => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setIsStreaming(false)
    setIsPaused(false)
  }, [])

  return {
    streamedText,
    isStreaming,
    isPaused,
    error,
    wordCount,
    startStream,
    pause,
    resume,
    stop,
  }
}

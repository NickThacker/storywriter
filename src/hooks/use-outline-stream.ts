'use client'

import { useState, useCallback } from 'react'
import type { IntakeData } from '@/lib/validations/intake'
import type { GeneratedOutline } from '@/lib/outline/schema'

interface UseOutlineStreamReturn {
  streamedContent: string
  parsedOutline: GeneratedOutline | null
  isStreaming: boolean
  error: string | null
  startStream: (intakeData: IntakeData, direction?: string) => Promise<void>
}

/**
 * Client-side hook for consuming the outline generation SSE stream.
 *
 * Calls /api/generate/outline, reads SSE chunks, accumulates content tokens,
 * and parses the final JSON into a GeneratedOutline on stream completion.
 *
 * Handles:
 * - OpenAI-compatible SSE format (data: {...} lines)
 * - [DONE] completion signal
 * - OpenRouter heartbeat lines (": OPENROUTER PROCESSING")
 * - Partial JSON chunks during streaming (try/catch on intermediate parse)
 */
export function useOutlineStream(projectId: string): UseOutlineStreamReturn {
  const [streamedContent, setStreamedContent] = useState<string>('')
  const [parsedOutline, setParsedOutline] = useState<GeneratedOutline | null>(null)
  const [isStreaming, setIsStreaming] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const startStream = useCallback(
    async (intakeData: IntakeData, direction?: string): Promise<void> => {
      // Reset state for new stream
      setStreamedContent('')
      setParsedOutline(null)
      setError(null)
      setIsStreaming(true)

      try {
        // 1. POST to the SSE route handler
        const response = await fetch('/api/generate/outline', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId, intakeData, direction }),
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
                setStreamedContent(accumulated)
              }
            } catch {
              // Skip partial/malformed SSE chunks — this is expected during streaming
              // The full accumulated string will be parsed at completion
            }
          }
        }

        // 5. On stream completion, parse the full accumulated string into GeneratedOutline
        if (accumulated.trim()) {
          try {
            // Strip markdown code fences if the model wrapped its JSON in ```json...```
            let jsonStr = accumulated.trim()
            const fenceMatch = jsonStr.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```$/);
            if (fenceMatch) {
              jsonStr = fenceMatch[1].trim()
            }
            const outline = JSON.parse(jsonStr) as GeneratedOutline
            setParsedOutline(outline)
          } catch (parseErr) {
            console.error('Failed to parse final outline JSON:', parseErr)
            const preview = accumulated.trim().slice(0, 80)
            const looksLikeProse = /^[A-Z][a-z]/.test(preview) && !preview.startsWith('{')
            setError(
              looksLikeProse
                ? 'The AI returned prose instead of a structured outline. Please try again — this is usually a one-time model glitch.'
                : 'Failed to parse generated outline. Please try again.'
            )
          }
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'An unexpected error occurred during generation'
        console.error('Outline stream error:', err)
        setError(message)
      } finally {
        setIsStreaming(false)
      }
    },
    [projectId]
  )

  return {
    streamedContent,
    parsedOutline,
    isStreaming,
    error,
    startStream,
  }
}

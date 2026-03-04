// TransformStream that intercepts OpenRouter SSE final chunk usage data.
// CRITICAL: Every chunk is passed through immediately — this stream never blocks.
// The onUsage callback is called fire-and-forget when usage data is detected.

interface UsageData {
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
}

export function createTokenInterceptStream(
  onUsage: (usage: UsageData) => void
): TransformStream<Uint8Array, Uint8Array> {
  const decoder = new TextDecoder()
  let buffer = ''

  return new TransformStream({
    transform(chunk, controller) {
      // ALWAYS pass through first — never block the stream
      controller.enqueue(chunk)

      buffer += decoder.decode(chunk, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? '' // keep incomplete line in buffer

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6).trim()
        if (data === '[DONE]') continue
        try {
          const parsed = JSON.parse(data) as {
            usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number }
          }
          if (parsed.usage?.total_tokens) {
            onUsage(parsed.usage as UsageData)
          }
        } catch {
          // not JSON — skip
        }
      }
    },
    flush() {
      // Process any remaining buffered text after the stream ends
      if (buffer.startsWith('data: ')) {
        const data = buffer.slice(6).trim()
        if (data !== '[DONE]') {
          try {
            const parsed = JSON.parse(data) as {
              usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number }
            }
            if (parsed.usage?.total_tokens) {
              onUsage(parsed.usage as UsageData)
            }
          } catch {
            // ignore
          }
        }
      }
    },
  })
}

'use client'

import { useEffect, useRef } from 'react'
import { Loader2 } from 'lucide-react'

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

  // Auto-scroll to bottom as content streams in
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [streamedContent])

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

  return (
    <div className="flex flex-col h-full min-h-[500px]">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b">
        {isStreaming && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
        <div>
          <h2 className="text-base font-semibold">
            {isStreaming ? 'Generating your outline...' : 'Processing outline...'}
          </h2>
          {isStreaming && (
            <p className="text-xs text-muted-foreground mt-0.5">
              This usually takes 30–60 seconds
            </p>
          )}
        </div>
        {isStreaming && (
          <div className="ml-auto flex items-center gap-1">
            <span className="inline-flex gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" />
            </span>
          </div>
        )}
      </div>

      {/* Streamed content */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 bg-muted/30"
      >
        {streamedContent ? (
          <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap break-words leading-relaxed">
            {streamedContent}
            {isStreaming && (
              <span className="inline-block w-1.5 h-3.5 bg-primary ml-0.5 animate-pulse align-[-2px]" />
            )}
          </pre>
        ) : (
          <div className="flex items-center justify-center h-32">
            <p className="text-sm text-muted-foreground">Waiting for response...</p>
          </div>
        )}
      </div>
    </div>
  )
}

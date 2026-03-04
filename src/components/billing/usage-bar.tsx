'use client'

import { cn } from '@/lib/utils'

interface UsageBarProps {
  used: number
  total: number
  creditPack: number
  className?: string
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) {
    const m = n / 1_000_000
    return m % 1 === 0 ? `${m}M` : `${m.toFixed(1)}M`
  }
  if (n >= 1_000) {
    const k = n / 1_000
    return k % 1 === 0 ? `${k}K` : `${k.toFixed(1)}K`
  }
  return String(n)
}

export function UsageBar({ used, total, creditPack, className }: UsageBarProps) {
  const percent = total > 0 ? Math.min(Math.round((used / total) * 100), 100) : 0

  const fillColor =
    percent >= 80
      ? 'bg-red-500'
      : percent >= 50
        ? 'bg-yellow-500'
        : 'bg-blue-500'

  const isNearLimit = percent >= 80 && percent < 100
  const isExhausted = percent >= 100

  return (
    <div className={cn('space-y-1', className)}>
      {/* Labels row */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          Used: {formatTokens(used)} / {formatTokens(total)}
        </span>
        <span
          className={cn(
            'font-medium',
            isExhausted ? 'text-red-600' : isNearLimit ? 'text-yellow-600' : 'text-foreground'
          )}
        >
          {percent}%
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', fillColor)}
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* Credit pack label */}
      {creditPack > 0 && (
        <p className="text-xs text-muted-foreground">
          + {formatTokens(creditPack)} credit pack tokens
        </p>
      )}

      {/* Warning / exhausted messages */}
      {isExhausted && (
        <p className="text-xs font-medium text-red-600">Budget exhausted</p>
      )}
      {isNearLimit && (
        <p className="text-xs font-medium text-yellow-600">Approaching budget limit</p>
      )}
    </div>
  )
}

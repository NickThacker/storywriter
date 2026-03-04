'use client'

import { toast } from 'sonner'

/**
 * checkBudgetWarning — Reads the X-Budget-Warning response header and
 * fires a Sonner toast if the user is near their token budget limit.
 *
 * Safe to call outside a React component — no hook dependencies.
 */
export function checkBudgetWarning(response: Response): void {
  const warning = response.headers.get('X-Budget-Warning')
  if (warning === 'near_limit') {
    toast.warning(
      "You've used 80% of your monthly token budget. Consider upgrading or buying a credit pack.",
      {
        action: {
          label: 'View Usage',
          onClick: () => {
            window.location.href = '/usage'
          },
        },
        duration: 8000,
      }
    )
  }
}

/**
 * useBudgetWarning — React hook wrapper that returns checkBudgetWarning
 * for use inside components that prefer the hook pattern.
 */
export function useBudgetWarning() {
  return { checkBudgetWarning }
}

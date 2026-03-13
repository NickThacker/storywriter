'use client'

import { useEffect, useState } from 'react'

export function SpiderToggle() {
  const [enabled, setEnabled] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('meridian-spider-enabled')
    setEnabled(stored === null ? true : stored === 'true')
  }, [])

  function toggle() {
    const next = !enabled
    setEnabled(next)
    localStorage.setItem('meridian-spider-enabled', String(next))
    window.dispatchEvent(new Event('spider-toggle'))
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="flex items-center gap-3 group cursor-pointer"
    >
      <div
        className={`relative w-9 h-5 rounded-full transition-colors ${
          enabled ? 'bg-[color:var(--gold)]' : 'bg-muted'
        }`}
      >
        <div
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-background transition-transform ${
            enabled ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </div>
      <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
        Tiny spider companion
      </span>
    </button>
  )
}

'use client'

import { useEffect, useState, useRef, useCallback } from 'react'

// ──────────────────────────────────────────────────────────────────────────────
// Tiny spider that crawls randomly across the screen every few minutes.
// Toggle via localStorage key 'meridian-spider-enabled' (default: on).
// ──────────────────────────────────────────────────────────────────────────────

const SPIDER_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
  <!-- body -->
  <ellipse cx="12" cy="13" rx="3" ry="3.5"/>
  <circle cx="12" cy="8" r="2"/>
  <!-- eyes -->
  <circle cx="11" cy="7.5" r="0.5" fill="currentColor" stroke="none"/>
  <circle cx="13" cy="7.5" r="0.5" fill="currentColor" stroke="none"/>
  <!-- legs left -->
  <path d="M9 10 Q5 8 2 6"/>
  <path d="M9 12 Q5 11 1 10"/>
  <path d="M9 14 Q5 14 1 15"/>
  <path d="M10 16 Q7 18 3 20"/>
  <!-- legs right -->
  <path d="M15 10 Q19 8 22 6"/>
  <path d="M15 12 Q19 11 23 10"/>
  <path d="M15 14 Q19 14 23 15"/>
  <path d="M14 16 Q17 18 21 20"/>
</svg>
`

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function randomBetween(min: number, max: number) {
  return Math.random() * (max - min) + min
}

export function Spider() {
  const [enabled, setEnabled] = useState(false)
  const [visible, setVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const animRef = useRef<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Check localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('meridian-spider-enabled')
    // Default to enabled if never set
    setEnabled(stored === null ? true : stored === 'true')
  }, [])

  // Listen for toggle events from settings
  useEffect(() => {
    function onStorageChange() {
      const val = localStorage.getItem('meridian-spider-enabled')
      setEnabled(val === null ? true : val === 'true')
    }
    window.addEventListener('spider-toggle', onStorageChange)
    return () => window.removeEventListener('spider-toggle', onStorageChange)
  }, [])

  const crawl = useCallback(() => {
    if (!ref.current) return

    const el = ref.current
    setVisible(true)

    // Pick a random edge to start from
    const edge = Math.floor(Math.random() * 4) // 0=top 1=right 2=bottom 3=left
    const vw = window.innerWidth
    const vh = window.innerHeight

    let startX: number, startY: number
    switch (edge) {
      case 0: startX = randomBetween(50, vw - 50); startY = -16; break
      case 1: startX = vw + 16; startY = randomBetween(50, vh - 50); break
      case 2: startX = randomBetween(50, vw - 50); startY = vh + 16; break
      default: startX = -16; startY = randomBetween(50, vh - 50); break
    }

    // Pick a target somewhere in the middle-ish area
    const midX = randomBetween(vw * 0.15, vw * 0.85)
    const midY = randomBetween(vh * 0.15, vh * 0.85)

    // Pick an exit edge (opposite-ish)
    const exitEdge = (edge + 2 + Math.floor(Math.random() * 2) - 1 + 4) % 4
    let endX: number, endY: number
    switch (exitEdge) {
      case 0: endX = randomBetween(50, vw - 50); endY = -16; break
      case 1: endX = vw + 16; endY = randomBetween(50, vh - 50); break
      case 2: endX = randomBetween(50, vw - 50); endY = vh + 16; break
      default: endX = -16; endY = randomBetween(50, vh - 50); break
    }

    // Waypoints: start → mid → end
    const waypoints = [
      { x: startX, y: startY },
      { x: midX, y: midY },
      { x: endX, y: endY },
    ]

    // Add a couple random pauses
    const pauseAt = randomBetween(0.3, 0.5)
    const pauseDuration = randomBetween(500, 1500)

    const totalDuration = randomBetween(8000, 14000) // ms for the full crawl
    const startTime = performance.now()
    let pauseStart: number | null = null
    let totalPaused = 0

    function animate(now: number) {
      // Handle pause
      if (pauseStart !== null) {
        if (now - pauseStart < pauseDuration) {
          animRef.current = requestAnimationFrame(animate)
          return
        }
        totalPaused += pauseDuration
        pauseStart = null
      }

      const elapsed = now - startTime - totalPaused
      let t = Math.min(elapsed / totalDuration, 1)

      // Check if we should pause
      if (pauseAt > 0 && t >= pauseAt && t < pauseAt + 0.01 && pauseStart === null && totalPaused === 0) {
        pauseStart = now
        // Wiggle legs during pause (handled by CSS animation)
        el.classList.add('spider-paused')
        setTimeout(() => el.classList.remove('spider-paused'), pauseDuration)
        animRef.current = requestAnimationFrame(animate)
        return
      }

      // Two-segment path
      let x: number, y: number
      if (t < 0.5) {
        const segT = t / 0.5
        x = lerp(waypoints[0].x, waypoints[1].x, segT)
        y = lerp(waypoints[0].y, waypoints[1].y, segT)
      } else {
        const segT = (t - 0.5) / 0.5
        x = lerp(waypoints[1].x, waypoints[2].x, segT)
        y = lerp(waypoints[1].y, waypoints[2].y, segT)
      }

      // Calculate angle for rotation
      const nextT = Math.min(t + 0.01, 1)
      let nx: number, ny: number
      if (nextT < 0.5) {
        const segT = nextT / 0.5
        nx = lerp(waypoints[0].x, waypoints[1].x, segT)
        ny = lerp(waypoints[0].y, waypoints[1].y, segT)
      } else {
        const segT = (nextT - 0.5) / 0.5
        nx = lerp(waypoints[1].x, waypoints[2].x, segT)
        ny = lerp(waypoints[1].y, waypoints[2].y, segT)
      }

      const angle = Math.atan2(ny - y, nx - x) * (180 / Math.PI) + 90

      // Tiny wobble for leg movement feel
      const wobble = Math.sin(elapsed * 0.015) * 1.5

      el.style.transform = `translate(${x + wobble}px, ${y}px) rotate(${angle}deg)`

      if (t < 1) {
        animRef.current = requestAnimationFrame(animate)
      } else {
        setVisible(false)
        scheduleNext()
      }
    }

    animRef.current = requestAnimationFrame(animate)
  }, [])

  const scheduleNext = useCallback(() => {
    // Random interval: 2-5 minutes
    const delay = randomBetween(2 * 60 * 1000, 5 * 60 * 1000)
    timerRef.current = setTimeout(crawl, delay)
  }, [crawl])

  useEffect(() => {
    if (!enabled) {
      setVisible(false)
      if (animRef.current) cancelAnimationFrame(animRef.current)
      if (timerRef.current) clearTimeout(timerRef.current)
      return
    }

    // Expose a global for testing: window.spiderCrawl()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window as any).spiderCrawl = crawl

    // First appearance: 30-90 seconds after mount
    const initialDelay = randomBetween(30_000, 90_000)
    timerRef.current = setTimeout(crawl, initialDelay)

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [enabled, crawl])

  if (!enabled) return null

  return (
    <div
      ref={ref}
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 9999,
        pointerEvents: 'none',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.3s',
        color: 'var(--muted-foreground)',
        filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))',
      }}
      dangerouslySetInnerHTML={{ __html: SPIDER_SVG }}
    />
  )
}

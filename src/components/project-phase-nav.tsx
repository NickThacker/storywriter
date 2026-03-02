'use client'

import { usePathname } from 'next/navigation'
import { PhaseNav } from '@/components/chapters/phase-nav'

type Phase = 'intake' | 'outline' | 'story-bible' | 'chapters'

export function ProjectPhaseNav({ projectId }: { projectId: string }) {
  const pathname = usePathname()

  let currentPhase: Phase = 'intake'
  if (pathname.includes('/chapters')) currentPhase = 'chapters'
  else if (pathname.includes('/outline')) currentPhase = 'outline'
  else if (pathname.includes('/story-bible')) currentPhase = 'story-bible'
  else if (pathname.includes('/intake')) currentPhase = 'intake'

  return <PhaseNav projectId={projectId} currentPhase={currentPhase} />
}

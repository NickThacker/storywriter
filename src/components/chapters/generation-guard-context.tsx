'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

interface GenerationGuardContextValue {
  isGenerating: boolean
  setGenerating: (value: boolean) => void
}

const GenerationGuardContext = createContext<GenerationGuardContextValue>({
  isGenerating: false,
  setGenerating: () => {},
})

export function GenerationGuardProvider({ children }: { children: ReactNode }) {
  const [isGenerating, setIsGenerating] = useState(false)

  const setGenerating = useCallback((value: boolean) => {
    setIsGenerating(value)
  }, [])

  return (
    <GenerationGuardContext.Provider value={{ isGenerating, setGenerating }}>
      {children}
    </GenerationGuardContext.Provider>
  )
}

export function useGenerationGuard() {
  return useContext(GenerationGuardContext)
}

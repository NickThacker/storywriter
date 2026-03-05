'use client'

import { type ReactNode, createContext, useContext, useRef } from 'react'
import { useStore } from 'zustand'
import {
  createVoiceWizardStore,
  type VoiceWizardStore,
  type VoiceWizardState,
} from '@/lib/stores/voice-wizard-store'

const VoiceWizardStoreContext = createContext<VoiceWizardStore | null>(null)

export function VoiceWizardStoreProvider({ children }: { children: ReactNode }) {
  const storeRef = useRef<VoiceWizardStore | null>(null)
  if (!storeRef.current) {
    storeRef.current = createVoiceWizardStore()
  }
  return (
    <VoiceWizardStoreContext.Provider value={storeRef.current}>
      {children}
    </VoiceWizardStoreContext.Provider>
  )
}

export function useVoiceWizardStore<T>(selector: (state: VoiceWizardState) => T): T {
  const store = useContext(VoiceWizardStoreContext)
  if (!store) throw new Error('useVoiceWizardStore must be used within VoiceWizardStoreProvider')
  return useStore(store, selector)
}

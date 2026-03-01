'use client'

import { createContext, useContext, useRef, type ReactNode } from 'react'
import { useStore } from 'zustand'
import {
  createIntakeStore,
  type IntakeState,
  type IntakeStore,
} from '@/lib/stores/intake-store'

// Context holds the store instance, not the state
type IntakeStoreContextValue = IntakeStore | null
const IntakeStoreContext = createContext<IntakeStoreContextValue>(null)

interface IntakeStoreProviderProps {
  children: ReactNode
  initialState?: Partial<IntakeState>
}

export function IntakeStoreProvider({
  children,
  initialState,
}: IntakeStoreProviderProps) {
  // useRef ensures we create only one store instance per component mount
  const storeRef = useRef<IntakeStore | null>(null)
  if (!storeRef.current) {
    storeRef.current = createIntakeStore()
    // Apply initial state (e.g. server-side draft data) after creation
    if (initialState) {
      storeRef.current.getState().hydrateFromPrefill(initialState)
    }
  }

  return (
    <IntakeStoreContext.Provider value={storeRef.current}>
      {children}
    </IntakeStoreContext.Provider>
  )
}

export function useIntakeStore<T>(selector: (state: IntakeState) => T): T {
  const store = useContext(IntakeStoreContext)
  if (!store) {
    throw new Error(
      'useIntakeStore must be used inside <IntakeStoreProvider>. ' +
        'Wrap your intake wizard pages with IntakeStoreProvider.'
    )
  }
  return useStore(store, selector)
}

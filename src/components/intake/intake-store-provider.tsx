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

// Separate context for the locked flag (derived from server data, not editable)
const IntakeLockedContext = createContext<boolean>(false)

interface IntakeStoreProviderProps {
  children: ReactNode
  initialState?: Partial<IntakeState>
  locked?: boolean
}

export function IntakeStoreProvider({
  children,
  initialState,
  locked = false,
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
    <IntakeLockedContext.Provider value={locked}>
      <IntakeStoreContext.Provider value={storeRef.current}>
        {children}
      </IntakeStoreContext.Provider>
    </IntakeLockedContext.Provider>
  )
}

export function useIntakeLocked(): boolean {
  return useContext(IntakeLockedContext)
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

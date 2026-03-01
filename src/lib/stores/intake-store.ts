import { createStore } from 'zustand/vanilla'

export type BeatSheetId = 'save-the-cat' | 'three-act' | 'heros-journey' | 'romancing-the-beat'
export type NovelLength = 'short' | 'standard' | 'epic'

export const TOTAL_STEPS = 7

export interface IntakeState {
  // Path selection
  path: 'wizard' | 'premise' | null
  // Step data
  genre: string | null
  themes: string[]
  characters: { role: string; archetype: string; name?: string }[]
  setting: string | null
  tone: string | null
  beatSheet: BeatSheetId | null
  targetLength: NovelLength
  chapterCount: number
  premise: string | null
  // Navigation
  currentStep: number
  // Actions
  setPath: (path: 'wizard' | 'premise') => void
  setGenre: (genre: string) => void
  setThemes: (themes: string[]) => void
  addCharacter: (character: { role: string; archetype: string; name?: string }) => void
  removeCharacter: (index: number) => void
  setSetting: (setting: string) => void
  setTone: (tone: string) => void
  setBeatSheet: (id: BeatSheetId) => void
  setTargetLength: (length: NovelLength, chapters: number) => void
  setChapterCount: (count: number) => void
  setPremise: (text: string) => void
  hydrateFromPrefill: (prefill: Partial<IntakeState>) => void
  goToStep: (step: number) => void
  nextStep: () => void
  prevStep: () => void
  reset: () => void
}

const defaultState = {
  path: null as 'wizard' | 'premise' | null,
  genre: null as string | null,
  themes: [] as string[],
  characters: [] as { role: string; archetype: string; name?: string }[],
  setting: null as string | null,
  tone: null as string | null,
  beatSheet: null as BeatSheetId | null,
  targetLength: 'standard' as NovelLength,
  chapterCount: 24,
  premise: null as string | null,
  currentStep: 0,
}

export const createIntakeStore = () =>
  createStore<IntakeState>((set) => ({
    ...defaultState,

    setPath: (path) => set({ path }),

    setGenre: (genre) => set({ genre }),

    setThemes: (themes) => set({ themes }),

    addCharacter: (character) =>
      set((state) => ({ characters: [...state.characters, character] })),

    removeCharacter: (index) =>
      set((state) => ({
        characters: state.characters.filter((_, i) => i !== index),
      })),

    setSetting: (setting) => set({ setting }),

    setTone: (tone) => set({ tone }),

    setBeatSheet: (id) => set({ beatSheet: id }),

    setTargetLength: (length, chapters) =>
      set({ targetLength: length, chapterCount: chapters }),

    setChapterCount: (count) => set({ chapterCount: count }),

    setPremise: (text) => set({ premise: text }),

    hydrateFromPrefill: (prefill) =>
      set((state) => ({ ...state, ...prefill })),

    goToStep: (step) =>
      set({ currentStep: Math.max(0, Math.min(step, TOTAL_STEPS - 1)) }),

    nextStep: () =>
      set((state) => ({
        currentStep: Math.min(state.currentStep + 1, TOTAL_STEPS - 1),
      })),

    prevStep: () =>
      set((state) => ({
        currentStep: Math.max(state.currentStep - 1, 0),
      })),

    reset: () =>
      set({
        path: null,
        genre: null,
        themes: [],
        characters: [],
        setting: null,
        tone: null,
        beatSheet: null,
        targetLength: 'standard',
        chapterCount: 24,
        premise: null,
        currentStep: 0,
      }),
  }))

export type IntakeStore = ReturnType<typeof createIntakeStore>

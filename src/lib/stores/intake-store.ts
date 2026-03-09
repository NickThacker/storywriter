import { createStore } from 'zustand/vanilla'

export type BeatSheetId = 'save-the-cat' | 'three-act' | 'heros-journey' | 'romancing-the-beat'
export type NovelLength = 'short' | 'standard' | 'epic'

export const TOTAL_STEPS = 7

export interface IntakeCharacter {
  name: string           // REQUIRED -- only mandatory field
  appearance?: string    // optional
  personality?: string   // optional (covers personality + voice)
  backstory?: string     // optional
  arc?: string           // optional
}

export interface IntakeState {
  // Path selection
  path: 'wizard' | 'premise' | null
  // Step data
  genre: string | null
  themes: string[]
  characters: IntakeCharacter[]
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
  addCharacter: (character: IntakeCharacter) => void
  removeCharacter: (index: number) => void
  updateCharacter: (index: number, updates: Partial<IntakeCharacter>) => void
  setCharacters: (characters: IntakeCharacter[]) => void
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
  characters: [] as IntakeCharacter[],
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

    updateCharacter: (index, updates) =>
      set((state) => ({
        characters: state.characters.map((c, i) => i === index ? { ...c, ...updates } : c),
      })),

    setCharacters: (characters) => set({ characters }),

    setSetting: (setting) => set({ setting }),

    setTone: (tone) => set({ tone }),

    setBeatSheet: (id) => set({ beatSheet: id }),

    setTargetLength: (length, chapters) =>
      set({ targetLength: length, chapterCount: chapters }),

    setChapterCount: (count) => set({ chapterCount: count }),

    setPremise: (text) => set({ premise: text }),

    hydrateFromPrefill: (prefill) =>
      set((state) => {
        const normalized = { ...state, ...prefill }
        // Normalize old { role, archetype, name? } format to new { name, ... }
        if (Array.isArray(normalized.characters)) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          normalized.characters = normalized.characters.map((c: any) => {
            if ('role' in c && !('name' in c && c.name)) {
              // Old format: use role as placeholder name
              return { name: c.name || c.role || 'Unnamed' }
            }
            // Already new format or has name
            return {
              name: c.name,
              appearance: c.appearance,
              personality: c.personality,
              backstory: c.backstory,
              arc: c.arc,
            }
          })
        }
        return normalized
      }),

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
        characters: [] as IntakeCharacter[],
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

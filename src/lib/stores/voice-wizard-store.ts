import { createStore } from 'zustand/vanilla'

export const TOTAL_VOICE_STEPS = 3

export interface VoiceWizardState {
  currentStep: number
  // Step 1: Writing samples
  pastedSamples: string[]         // User-pasted text blocks (array supports multiple)
  uploadedFileTexts: string[]     // Extracted text from uploaded files
  // Step 2: Style preferences
  tonePreference: string | null
  pacingPreference: string | null
  dialogueRatio: string | null
  darkLightTheme: string | null
  povPreference: string | null
  dictionLevel: string | null
  // Step 3: Analysis results (populated after AI analysis completes)
  analysisComplete: boolean
  voiceDescription: string | null
  styleDescriptors: Record<string, string> | null
  thematicPreferences: Record<string, string> | null
  rawGuidanceText: string | null
  // Actions
  nextStep: () => void
  prevStep: () => void
  setStep: (step: number) => void
  addPastedSample: (text: string) => void
  removePastedSample: (index: number) => void
  addUploadedFileText: (text: string) => void
  removeUploadedFileText: (index: number) => void
  setStylePreference: (key: keyof Pick<VoiceWizardState,
    'tonePreference' | 'pacingPreference' | 'dialogueRatio' |
    'darkLightTheme' | 'povPreference' | 'dictionLevel'
  >, value: string) => void
  setAnalysisResult: (result: {
    voiceDescription: string
    styleDescriptors: Record<string, string>
    thematicPreferences: Record<string, string>
    rawGuidanceText: string
  }) => void
  reset: () => void
}

export const createVoiceWizardStore = () =>
  createStore<VoiceWizardState>()((set) => ({
    currentStep: 1,
    pastedSamples: [],
    uploadedFileTexts: [],
    tonePreference: null,
    pacingPreference: null,
    dialogueRatio: null,
    darkLightTheme: null,
    povPreference: null,
    dictionLevel: null,
    analysisComplete: false,
    voiceDescription: null,
    styleDescriptors: null,
    thematicPreferences: null,
    rawGuidanceText: null,
    nextStep: () =>
      set((s) => ({ currentStep: Math.min(s.currentStep + 1, TOTAL_VOICE_STEPS) })),
    prevStep: () =>
      set((s) => ({ currentStep: Math.max(s.currentStep - 1, 1) })),
    setStep: (step) => set({ currentStep: step }),
    addPastedSample: (text) =>
      set((s) => ({ pastedSamples: [...s.pastedSamples, text] })),
    removePastedSample: (index) =>
      set((s) => ({ pastedSamples: s.pastedSamples.filter((_, i) => i !== index) })),
    addUploadedFileText: (text) =>
      set((s) => ({ uploadedFileTexts: [...s.uploadedFileTexts, text] })),
    removeUploadedFileText: (index) =>
      set((s) => ({ uploadedFileTexts: s.uploadedFileTexts.filter((_, i) => i !== index) })),
    setStylePreference: (key, value) => set({ [key]: value }),
    setAnalysisResult: (result) =>
      set({
        analysisComplete: true,
        voiceDescription: result.voiceDescription,
        styleDescriptors: result.styleDescriptors,
        thematicPreferences: result.thematicPreferences,
        rawGuidanceText: result.rawGuidanceText,
      }),
    reset: () =>
      set({
        currentStep: 1,
        pastedSamples: [],
        uploadedFileTexts: [],
        tonePreference: null,
        pacingPreference: null,
        dialogueRatio: null,
        darkLightTheme: null,
        povPreference: null,
        dictionLevel: null,
        analysisComplete: false,
        voiceDescription: null,
        styleDescriptors: null,
        thematicPreferences: null,
        rawGuidanceText: null,
      }),
  }))

export type VoiceWizardStore = ReturnType<typeof createVoiceWizardStore>

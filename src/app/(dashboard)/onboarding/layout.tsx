import { VoiceWizardStoreProvider } from '@/components/onboarding/onboarding-store-provider'

export const metadata = {
  title: 'Author Voice Setup — StoryWriter',
}

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return <VoiceWizardStoreProvider>{children}</VoiceWizardStoreProvider>
}

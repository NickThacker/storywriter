import { ProjectPhaseNav } from '@/components/project-phase-nav'
import { GenerationGuardProvider } from '@/components/chapters/generation-guard-context'

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <GenerationGuardProvider>
      <div className="flex h-full flex-col">
        <ProjectPhaseNav projectId={id} />
        <div className="flex-1 overflow-hidden">
          {children}
        </div>
      </div>
    </GenerationGuardProvider>
  )
}

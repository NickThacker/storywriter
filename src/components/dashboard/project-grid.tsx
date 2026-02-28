'use client'

import { ProjectCard } from '@/components/dashboard/project-card'
import { CreateProjectDialog } from '@/components/dashboard/create-project-dialog'
import { Button } from '@/components/ui/button'
import type { Project } from '@/types/database'

interface ProjectGridProps {
  projects: Project[]
}

export function ProjectGrid({ projects }: ProjectGridProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Your Novels</h1>
        <CreateProjectDialog trigger={<Button>New Project</Button>} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
    </div>
  )
}

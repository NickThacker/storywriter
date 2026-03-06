'use client'

import { ProjectCard } from '@/components/dashboard/project-card'
import { CreateProjectDialog } from '@/components/dashboard/create-project-dialog'
import type { Project } from '@/types/database'

interface ProjectGridProps {
  projects: Project[]
}

export function ProjectGrid({ projects }: ProjectGridProps) {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between border-b border-border pb-5">
        <div>
          <p
            className="text-[0.65rem] uppercase tracking-[0.15em] mb-2"
            style={{ color: 'var(--gold)' }}
          >
            Your work
          </p>
          <h1
            className="font-[family-name:var(--font-literata)] text-foreground"
            style={{ fontSize: 'clamp(1.6rem, 3vw, 2.25rem)', fontWeight: 400, lineHeight: 1.1 }}
          >
            Your Library
          </h1>
        </div>

        <CreateProjectDialog
          trigger={
            <button
              className="text-[0.68rem] uppercase tracking-[0.1em] px-4 py-2.5 font-medium transition-colors duration-150"
              style={{
                background: 'var(--gold)',
                color: 'oklch(0.145 0 0)',
                borderRadius: 0,
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.opacity = '0.85')
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.opacity = '1')
              }
            >
              New Novel
            </button>
          }
        />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
    </div>
  )
}

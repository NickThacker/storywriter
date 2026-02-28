'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MoreVertical } from 'lucide-react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DeleteProjectDialog } from '@/components/dashboard/delete-project-dialog'
import type { Project, ProjectStatus } from '@/types/database'

function timeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMs = now - then
  const diffSec = Math.floor(diffMs / 1000)

  if (diffSec < 60) return 'less than 1 min ago'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}min ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}hr ago`
  const diffDays = Math.floor(diffHr / 24)
  return `${diffDays}d ago`
}

function statusVariant(status: ProjectStatus): 'secondary' | 'default' | 'outline' {
  switch (status) {
    case 'draft':
      return 'secondary'
    case 'writing':
      return 'default'
    case 'complete':
      return 'outline'
  }
}

function statusLabel(status: ProjectStatus): string {
  switch (status) {
    case 'draft':
      return 'Draft'
    case 'writing':
      return 'Writing'
    case 'complete':
      return 'Complete'
  }
}

interface ProjectCardProps {
  project: Project
}

export function ProjectCard({ project }: ProjectCardProps) {
  const [deleteOpen, setDeleteOpen] = useState(false)

  const progress =
    project.chapter_count > 0
      ? Math.round((project.chapters_done / project.chapter_count) * 100)
      : null

  return (
    <>
      <Link
        href={`/projects/${project.id}`}
        className="group block focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-xl"
      >
        <Card className="h-full transition-shadow group-hover:shadow-md relative">
          {/* Three-dot menu button — stops propagation so card link is not triggered */}
          <button
            type="button"
            className="absolute top-3 right-3 z-10 inline-flex items-center justify-center rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setDeleteOpen(true)
            }}
            aria-label="Project options"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
          <CardHeader className="pb-2 pr-10">
            <div className="flex items-start gap-2">
              <CardTitle className="text-base font-semibold leading-snug line-clamp-2 flex-1">
                {project.title}
              </CardTitle>
            </div>
            <div className="flex items-center gap-2 flex-wrap mt-1">
              <Badge variant={statusVariant(project.status)}>{statusLabel(project.status)}</Badge>
              {project.genre && (
                <span className="text-xs text-muted-foreground">{project.genre}</span>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{project.word_count.toLocaleString()} words</span>
              <span>{timeAgo(project.updated_at)}</span>
            </div>
            {/* Progress bar */}
            {progress !== null ? (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Progress</span>
                  <span>
                    {project.chapters_done} / {project.chapter_count} chapters
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No chapters yet</p>
            )}
          </CardContent>
        </Card>
      </Link>
      <DeleteProjectDialog
        projectId={project.id}
        projectTitle={project.title}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </>
  )
}

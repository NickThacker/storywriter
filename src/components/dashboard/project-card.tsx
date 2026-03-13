'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MoreVertical, Pencil, BookOpen, FileText, Trash2 } from 'lucide-react'
import { DeleteProjectDialog } from '@/components/dashboard/delete-project-dialog'
import { RenameProjectDialog } from '@/components/dashboard/rename-project-dialog'
import type { Project, ProjectStatus } from '@/types/database'

function timeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMs = now - then
  const diffSec = Math.floor(diffMs / 1000)
  if (diffSec < 60) return 'just now'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDays = Math.floor(diffHr / 24)
  return `${diffDays}d ago`
}

function statusLabel(status: ProjectStatus): string {
  switch (status) {
    case 'draft':    return 'Draft'
    case 'writing':  return 'Writing'
    case 'complete': return 'Complete'
  }
}

interface ProjectCardProps {
  project: Project
}

export function ProjectCard({ project }: ProjectCardProps) {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [renameOpen, setRenameOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  const showProgress = project.status === 'writing' && project.chapter_count > 0
  const progress = showProgress
    ? Math.round((project.chapters_done / project.chapter_count) * 100)
    : null

  return (
    <>
      <div className="relative group h-full">
        <Link
          href={`/projects/${project.id}`}
          className="block h-full focus:outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--gold)]"
        >
          <div
            className="border border-border bg-card transition-colors duration-150 group-hover:border-[color:var(--gold)]/40 group-hover:bg-card/80 p-5 h-full flex flex-col gap-4"
            style={{ borderRadius: 0 }}
          >
            {/* Title */}
            <div className="flex-1">
              <h3
                className="font-[family-name:var(--font-literata)] text-foreground leading-snug line-clamp-2 mb-2"
                style={{ fontSize: '1.0625rem', fontWeight: 400 }}
              >
                {project.title}
              </h3>
              <div className="flex items-center gap-3">
                <span className="text-[0.65rem] uppercase tracking-[0.1em] text-[color:var(--gold)]">
                  {statusLabel(project.status)}
                </span>
                {project.genre && (
                  <>
                    <span className="text-border">·</span>
                    <span className="text-[0.65rem] uppercase tracking-[0.08em] text-muted-foreground">
                      {project.genre}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex flex-col gap-2">
              {/* Progress bar */}
              {progress !== null && (
                <div>
                  <div className="flex justify-between text-[0.65rem] text-muted-foreground mb-1.5 tracking-[0.04em]">
                    <span>{project.chapters_done} / {project.chapter_count} chapters</span>
                    <span>{project.word_count.toLocaleString()} words</span>
                  </div>
                  <div className="h-px w-full bg-border overflow-hidden">
                    <div
                      className="h-full transition-all duration-300"
                      style={{ width: `${progress}%`, background: 'var(--gold)' }}
                    />
                  </div>
                </div>
              )}

              {/* Meta row */}
              <div className="flex items-center justify-between">
                {progress === null && (
                  <span className="text-[0.65rem] tracking-[0.04em] text-muted-foreground">
                    {project.word_count.toLocaleString()} words
                  </span>
                )}
                <span className="text-[0.65rem] tracking-[0.04em] text-muted-foreground ml-auto">
                  {timeAgo(project.updated_at)}
                </span>
              </div>
            </div>
          </div>
        </Link>

        {/* Options button + menu */}
        <div ref={menuRef} className="absolute top-3 right-3 z-10">
          <button
            type="button"
            className="p-1 text-muted-foreground hover:text-foreground transition-colors opacity-0 group-hover:opacity-100"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setMenuOpen((v) => !v)
            }}
            aria-label="Project options"
          >
            <MoreVertical className="h-3.5 w-3.5" />
          </button>

          {menuOpen && (
            <div
              className="absolute right-0 top-full mt-1 w-44 border border-border bg-card shadow-lg py-1 z-20"
              style={{ borderRadius: 0 }}
            >
              <button
                type="button"
                className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-foreground hover:bg-muted/60 transition-colors"
                onClick={(e) => {
                  e.stopPropagation()
                  setMenuOpen(false)
                  setRenameOpen(true)
                }}
              >
                <Pencil className="h-3 w-3 text-muted-foreground" />
                Rename
              </button>
              <button
                type="button"
                className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-foreground hover:bg-muted/60 transition-colors"
                onClick={(e) => {
                  e.stopPropagation()
                  setMenuOpen(false)
                  router.push(`/projects/${project.id}/intake`)
                }}
              >
                <FileText className="h-3 w-3 text-muted-foreground" />
                Edit Intake
              </button>
              <button
                type="button"
                className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-foreground hover:bg-muted/60 transition-colors"
                onClick={(e) => {
                  e.stopPropagation()
                  setMenuOpen(false)
                  router.push(`/projects/${project.id}/outline`)
                }}
              >
                <BookOpen className="h-3 w-3 text-muted-foreground" />
                View Outline
              </button>
              <div className="my-1 h-px bg-border" />
              <button
                type="button"
                className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-destructive hover:bg-destructive/10 transition-colors"
                onClick={(e) => {
                  e.stopPropagation()
                  setMenuOpen(false)
                  setDeleteOpen(true)
                }}
              >
                <Trash2 className="h-3 w-3" />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      <RenameProjectDialog
        projectId={project.id}
        currentTitle={project.title}
        open={renameOpen}
        onOpenChange={setRenameOpen}
      />

      <DeleteProjectDialog
        projectId={project.id}
        projectTitle={project.title}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </>
  )
}

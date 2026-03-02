'use client'

import { useEffect, useMemo } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Node } from '@tiptap/core'
import { useDebouncedCallback } from 'use-debounce'
import { Bold, Italic, Heading2, Heading3, Minus, MessageSquare } from 'lucide-react'

// ─── Custom Extensions ───────────────────────────────────────────────────────

/**
 * SceneBreak — an atomic block node that renders as <hr class="scene-break">.
 * Visually shown as centered *** via CSS. Not part of plain text export.
 */
const SceneBreak = Node.create({
  name: 'sceneBreak',
  group: 'block',
  atom: true, // cannot contain content

  parseHTML() {
    return [{ tag: 'hr.scene-break' }]
  },

  renderHTML() {
    return ['hr', { class: 'scene-break' }]
  },

  addCommands() {
    return {
      insertSceneBreak:
        () =>
        ({ commands }) =>
          commands.insertContent({ type: this.name }),
    }
  },
})

/**
 * AuthorNote — a block node with inline content, rendered as <aside data-author-note>.
 * Styled with amber background. Excluded from final plain text export.
 */
const AuthorNote = Node.create({
  name: 'authorNote',
  group: 'block',
  content: 'inline*',

  parseHTML() {
    return [{ tag: 'aside[data-author-note]' }]
  },

  renderHTML() {
    return ['aside', { 'data-author-note': '', class: 'author-note' }, 0]
  },

  addCommands() {
    return {
      insertAuthorNote:
        () =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            content: [{ type: 'text', text: '' }],
          }),
    }
  },
})

// ─── Type Augmentation for Custom Commands ───────────────────────────────────

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    sceneBreak: {
      insertSceneBreak: () => ReturnType
    }
    authorNote: {
      insertAuthorNote: () => ReturnType
    }
  }
}

// ─── Toolbar ─────────────────────────────────────────────────────────────────

interface ToolbarButtonProps {
  onClick: () => void
  isActive?: boolean
  disabled?: boolean
  title: string
  children: React.ReactNode
}

function ToolbarButton({ onClick, isActive, disabled, title, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-1.5 rounded transition-colors ${
        isActive
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
      } ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      {children}
    </button>
  )
}

// ─── Props ───────────────────────────────────────────────────────────────────

export interface ChapterEditorProps {
  /** Plain text from the chapter_text column */
  initialContent: string
  /** Called on debounced (600ms) save with plain text */
  onSave: (text: string) => Promise<void>
  /** Disable editing — e.g. during streaming generation */
  readOnly?: boolean
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Convert stored plain text (with \n\n paragraph breaks) to HTML for Tiptap.
 * Handles **bold**, *italic*, and *** scene breaks.
 */
function plainTextToHtml(text: string): string {
  if (!text || !text.trim()) return '<p></p>'

  // Normalize line endings: \r\n → \n
  const normalized = text.replace(/\r\n/g, '\n')

  // Split on double-newline first; fall back to single-newline if only one paragraph results
  let blocks = normalized.split(/\n\n/)
  if (blocks.length <= 1 && normalized.includes('\n')) {
    blocks = normalized.split(/\n/)
  }

  return blocks
    .map((block) => {
      const trimmed = block.trim()
      if (!trimmed) return ''
      // Scene break
      if (/^(\*\s*\*\s*\*|---+)$/.test(trimmed)) {
        return '<hr class="scene-break">'
      }
      // Escape HTML, then apply inline markdown
      let html = trimmed
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
      // Bold-italic (***text***), then bold (**text**), then italic (*text*)
      html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
      html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')
      return `<p>${html}</p>`
    })
    .filter(Boolean)
    .join('')
}

export function ChapterEditor({ initialContent, onSave, readOnly = false }: ChapterEditorProps) {
  // Convert plain text → HTML once on init
  const htmlContent = useMemo(() => plainTextToHtml(initialContent), [initialContent])

  const debouncedSave = useDebouncedCallback(async (text: string) => {
    await onSave(text)
  }, 600)

  const editor = useEditor({
    extensions: [StarterKit, SceneBreak, AuthorNote],
    content: htmlContent,
    immediatelyRender: false, // CRITICAL: prevents Next.js SSR/hydration error
    editable: !readOnly,
    onUpdate({ editor }) {
      // Save as plain text with double-newline paragraph separators
      const text = editor.getText({ blockSeparator: '\n\n' })
      debouncedSave(text)
    },
  })

  // Flush pending debounced saves on unmount (e.g. when navigating away)
  useEffect(() => {
    return () => {
      debouncedSave.flush()
    }
  }, [debouncedSave])

  // Sync readOnly prop changes
  useEffect(() => {
    if (editor) {
      editor.setEditable(!readOnly)
    }
  }, [editor, readOnly])

  // Word count derived from current editor text
  const wordCount = useMemo(() => {
    if (!editor) return 0
    const text = editor.getText()
    return text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor?.getText()])

  return (
    <>
      {/* Custom styles for novel-specific nodes */}
      <style>{`
        .ProseMirror:focus {
          outline: none;
        }
        .ProseMirror p {
          margin-bottom: 1em;
          line-height: 1.75;
        }
        .ProseMirror p:last-child {
          margin-bottom: 0;
        }
        .ProseMirror hr.scene-break {
          border: none;
          text-align: center;
          margin: 2rem 0;
          color: inherit;
        }
        .ProseMirror hr.scene-break::after {
          content: '* * *';
          font-size: 1.125rem;
          letter-spacing: 0.5em;
          color: var(--muted-foreground, #888);
          display: block;
        }
        .ProseMirror aside.author-note {
          background-color: rgb(255 251 235); /* amber-50 */
          border-left: 2px solid rgb(251 191 36); /* amber-400 */
          padding: 0.5rem 0.75rem;
          margin: 0.75rem 0;
          font-style: italic;
          font-size: 0.875rem;
          color: rgb(120 53 15); /* amber-900 */
          border-radius: 0 0.25rem 0.25rem 0;
        }
        @media (prefers-color-scheme: dark) {
          .ProseMirror aside.author-note {
            background-color: rgb(69 26 3 / 0.2); /* amber-950/20 */
            color: rgb(253 230 138); /* amber-200 */
          }
        }
        .dark .ProseMirror aside.author-note {
          background-color: rgb(69 26 3 / 0.2);
          color: rgb(253 230 138);
        }
        .ProseMirror aside.author-note::before {
          content: 'Author Note: ';
          font-weight: 600;
          font-style: normal;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          opacity: 0.7;
          display: block;
          margin-bottom: 0.25rem;
        }
        /* Prevent empty paragraphs from collapsing */
        .ProseMirror p.is-empty::before {
          content: attr(data-placeholder);
          color: var(--muted-foreground, #888);
          pointer-events: none;
          float: left;
          height: 0;
        }
      `}</style>

      <div className="flex flex-col h-full">
        {/* Toolbar */}
        {!readOnly && editor && (
          <div className="flex items-center gap-0.5 px-4 py-2.5 border-b border-border bg-muted/30 flex-wrap">
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBold().run()}
              isActive={editor.isActive('bold')}
              title="Bold (Ctrl+B)"
            >
              <Bold className="h-4 w-4" />
            </ToolbarButton>

            <ToolbarButton
              onClick={() => editor.chain().focus().toggleItalic().run()}
              isActive={editor.isActive('italic')}
              title="Italic (Ctrl+I)"
            >
              <Italic className="h-4 w-4" />
            </ToolbarButton>

            <div className="w-px h-4 bg-border mx-1" />

            <ToolbarButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              isActive={editor.isActive('heading', { level: 2 })}
              title="Heading 2"
            >
              <Heading2 className="h-4 w-4" />
            </ToolbarButton>

            <ToolbarButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              isActive={editor.isActive('heading', { level: 3 })}
              title="Heading 3"
            >
              <Heading3 className="h-4 w-4" />
            </ToolbarButton>

            <div className="w-px h-4 bg-border mx-1" />

            <ToolbarButton
              onClick={() => editor.chain().focus().insertSceneBreak().run()}
              title="Insert Scene Break (***)"
            >
              <Minus className="h-4 w-4" />
            </ToolbarButton>

            <ToolbarButton
              onClick={() => editor.chain().focus().insertAuthorNote().run()}
              title="Insert Author Note"
            >
              <MessageSquare className="h-4 w-4" />
            </ToolbarButton>
          </div>
        )}

        {/* Editor content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <EditorContent
            editor={editor}
            className="prose prose-sm max-w-none min-h-[200px]"
          />
        </div>

        {/* Word count badge */}
        <div className="flex justify-end px-4 py-2 border-t border-border bg-muted/20">
          <span className="text-xs text-muted-foreground tabular-nums">
            {wordCount.toLocaleString()} {wordCount === 1 ? 'word' : 'words'}
          </span>
        </div>
      </div>
    </>
  )
}

'use client'

import { useState, useRef, useEffect, KeyboardEvent } from 'react'
import { Pencil } from 'lucide-react'

interface InlineEditableProps {
  value: string
  onSave: (value: string) => void
  as?: 'h2' | 'p' | 'span'
  className?: string
  multiline?: boolean
  placeholder?: string
}

/**
 * Click-to-edit component using reveal-on-click input (NOT contentEditable).
 *
 * - View mode: renders text in the specified element, shows edit icon on hover
 * - Edit mode: reveals input/textarea, auto-focused, pre-filled
 * - Save: on blur or Enter (input) / Ctrl+Enter (textarea)
 * - Cancel: Escape reverts to original value
 */
export function InlineEditable({
  value,
  onSave,
  as: Tag = 'span',
  className = '',
  multiline = false,
  placeholder = 'Click to edit...',
}: InlineEditableProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Sync editValue when value prop changes externally
  useEffect(() => {
    if (!isEditing) {
      setEditValue(value)
    }
  }, [value, isEditing])

  // Auto-focus when entering edit mode
  useEffect(() => {
    if (isEditing) {
      if (multiline) {
        textareaRef.current?.focus()
        // Place cursor at end
        const len = textareaRef.current?.value.length ?? 0
        textareaRef.current?.setSelectionRange(len, len)
      } else {
        inputRef.current?.focus()
        const len = inputRef.current?.value.length ?? 0
        inputRef.current?.setSelectionRange(len, len)
      }
    }
  }, [isEditing, multiline])

  function enterEditMode() {
    setEditValue(value)
    setIsEditing(true)
  }

  function save() {
    setIsEditing(false)
    if (editValue !== value) {
      onSave(editValue)
    }
  }

  function cancel() {
    setEditValue(value)
    setIsEditing(false)
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) {
    if (e.key === 'Escape') {
      e.preventDefault()
      cancel()
    } else if (!multiline && e.key === 'Enter') {
      e.preventDefault()
      save()
    } else if (multiline && e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      save()
    }
  }

  if (isEditing) {
    const sharedProps = {
      value: editValue,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setEditValue(e.target.value),
      onBlur: save,
      onKeyDown: handleKeyDown,
      className: `w-full rounded border border-ring bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 ${className}`,
    }

    if (multiline) {
      return (
        <textarea
          ref={textareaRef}
          rows={4}
          {...sharedProps}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className={`${sharedProps.className} resize-none min-h-[80px]`}
        />
      )
    }

    return (
      <input
        ref={inputRef}
        type="text"
        {...sharedProps}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={handleKeyDown}
      />
    )
  }

  return (
    <Tag
      className={`group relative cursor-pointer inline-flex items-start gap-1 hover:bg-muted/50 rounded px-1 -mx-1 transition-colors ${className}`}
      onClick={enterEditMode}
      onKeyDown={(e: KeyboardEvent<HTMLElement>) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          enterEditMode()
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`Edit: ${value || placeholder}`}
    >
      <span className={value ? '' : 'text-muted-foreground italic'}>
        {value || placeholder}
      </span>
      <Pencil className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </Tag>
  )
}

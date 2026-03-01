'use client'

import { useState } from 'react'
import { User, Skull, HeartHandshake, GraduationCap, Users, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useIntakeStore } from '@/components/intake/intake-store-provider'
import { Button } from '@/components/ui/button'

interface RoleDefinition {
  role: string
  archetype: string
  label: string
  description: string
  Icon: React.ElementType
}

const ROLES: RoleDefinition[] = [
  {
    role: 'protagonist',
    archetype: 'hero',
    label: 'Protagonist',
    description: 'The main character at the heart of the story',
    Icon: User,
  },
  {
    role: 'antagonist',
    archetype: 'villain',
    label: 'Antagonist',
    description: 'The opposing force challenging the protagonist',
    Icon: Skull,
  },
  {
    role: 'love-interest',
    archetype: 'love-interest',
    label: 'Love Interest',
    description: 'A romantic connection for the protagonist',
    Icon: HeartHandshake,
  },
  {
    role: 'mentor',
    archetype: 'mentor',
    label: 'Mentor',
    description: 'A guide who offers wisdom and support',
    Icon: GraduationCap,
  },
  {
    role: 'sidekick',
    archetype: 'ally',
    label: 'Sidekick',
    description: "A loyal companion on the protagonist's journey",
    Icon: Users,
  },
]

export function CharactersStep() {
  const characters = useIntakeStore((s) => s.characters)
  const addCharacter = useIntakeStore((s) => s.addCharacter)
  const removeCharacter = useIntakeStore((s) => s.removeCharacter)

  // Track name inputs per role (keyed by role id)
  const [nameInputs, setNameInputs] = useState<Record<string, string>>({})
  // Track which role cards are expanded (selected)
  const [selectedRoles, setSelectedRoles] = useState<Set<string>>(() => {
    return new Set(characters.map((c) => c.role))
  })

  const isRoleSelected = (role: string) => selectedRoles.has(role)

  const toggleRole = (roleDef: RoleDefinition) => {
    if (isRoleSelected(roleDef.role)) {
      // Deselect: remove from store and local state
      const index = characters.findIndex((c) => c.role === roleDef.role)
      if (index !== -1) removeCharacter(index)
      setSelectedRoles((prev) => {
        const next = new Set(prev)
        next.delete(roleDef.role)
        return next
      })
    } else {
      // Select: add to store with optional name from input
      const name = nameInputs[roleDef.role]?.trim() || undefined
      addCharacter({ role: roleDef.role, archetype: roleDef.archetype, name })
      setSelectedRoles((prev) => new Set([...prev, roleDef.role]))
    }
  }

  const handleNameChange = (role: string, value: string) => {
    setNameInputs((prev) => ({ ...prev, [role]: value }))
    // Update store entry if already added
    const index = characters.findIndex((c) => c.role === role)
    if (index !== -1) {
      // Re-add: remove old, add new (Zustand has no updateCharacter)
      removeCharacter(index)
      const roleDef = ROLES.find((r) => r.role === role)!
      addCharacter({ role, archetype: roleDef.archetype, name: value.trim() || undefined })
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          Who are the key players?
        </h2>
        <p className="mt-1 text-muted-foreground">
          Select the character roles that will appear in your story. Add optional names.
        </p>
      </div>

      {/* Role cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {ROLES.map((roleDef) => {
          const selected = isRoleSelected(roleDef.role)
          return (
            <div key={roleDef.role} className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => toggleRole(roleDef)}
                aria-pressed={selected}
                className={cn(
                  'relative flex items-start gap-3 rounded-lg border p-4 text-left transition-colors',
                  selected
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50 hover:bg-muted/30'
                )}
              >
                <roleDef.Icon
                  className={cn(
                    'mt-0.5 h-5 w-5 shrink-0',
                    selected ? 'text-primary' : 'text-muted-foreground'
                  )}
                  aria-hidden="true"
                />
                <div className="flex flex-col">
                  <span className="font-medium">{roleDef.label}</span>
                  <span className="text-sm text-muted-foreground">
                    {roleDef.description}
                  </span>
                </div>
                {selected && (
                  <span
                    className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground"
                    aria-hidden="true"
                  >
                    <svg
                      className="h-3 w-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </span>
                )}
              </button>

              {/* Name input — shown when role is selected */}
              {selected && (
                <input
                  type="text"
                  placeholder={`${roleDef.label} name (optional)`}
                  value={nameInputs[roleDef.role] ?? ''}
                  onChange={(e) => handleNameChange(roleDef.role, e.target.value)}
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Selected characters summary */}
      {characters.length > 0 && (
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <h3 className="mb-3 text-sm font-semibold text-foreground">
            Selected characters ({characters.length})
          </h3>
          <ul className="flex flex-col gap-2">
            {characters.map((char, index) => (
              <li
                key={`${char.role}-${index}`}
                className="flex items-center justify-between gap-2"
              >
                <span className="text-sm">
                  <span className="font-medium capitalize">{char.role}</span>
                  {char.name && (
                    <span className="ml-1 text-muted-foreground">— {char.name}</span>
                  )}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    removeCharacter(index)
                    setSelectedRoles((prev) => {
                      const next = new Set(prev)
                      next.delete(char.role)
                      return next
                    })
                  }}
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                  aria-label={`Remove ${char.role}`}
                >
                  <X className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

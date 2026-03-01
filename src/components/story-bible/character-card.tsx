'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Bot } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CharacterDetail } from '@/components/story-bible/character-detail'
import type { CharacterRow, CharacterRole } from '@/types/database'

interface CharacterCardProps {
  character: CharacterRow
  projectId: string
}

type RoleBadgeVariant = 'default' | 'destructive' | 'secondary' | 'outline'

function roleVariant(role: CharacterRole): RoleBadgeVariant {
  switch (role) {
    case 'protagonist':
      return 'default'
    case 'antagonist':
      return 'destructive'
    case 'supporting':
      return 'secondary'
    case 'minor':
      return 'outline'
  }
}

function roleLabel(role: CharacterRole): string {
  switch (role) {
    case 'protagonist':
      return 'Protagonist'
    case 'antagonist':
      return 'Antagonist'
    case 'supporting':
      return 'Supporting'
    case 'minor':
      return 'Minor'
  }
}

export function CharacterCard({ character: initialCharacter, projectId }: CharacterCardProps) {
  const [expanded, setExpanded] = useState(false)
  // Track local character state so card updates after save without full page reload
  const [character, setCharacter] = useState(initialCharacter)

  return (
    <Card className="transition-shadow hover:shadow-sm">
      {/* Collapsed view — always visible */}
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm leading-snug truncate">{character.name}</p>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <Badge variant={roleVariant(character.role)} className="text-xs">
                {roleLabel(character.role)}
              </Badge>
              {character.source === 'ai' && (
                <Badge variant="outline" className="text-xs gap-0.5 px-1.5">
                  <Bot className="h-2.5 w-2.5" />
                  AI
                </Badge>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0 h-7 w-7 p-0"
            onClick={() => setExpanded((v) => !v)}
            aria-label={expanded ? 'Collapse character' : 'Expand character'}
          >
            {expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
        {character.one_line && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{character.one_line}</p>
        )}
      </CardHeader>

      {/* Expanded view — full profile editor */}
      {expanded && (
        <CardContent className="pt-0 border-t mt-2">
          <div className="pt-3">
            <CharacterDetail
              character={character}
              projectId={projectId}
              onSave={() => {
                // Character data will be refreshed on next page load via revalidatePath
                // The card shows the latest saved values via local state
              }}
              onDelete={() => {
                // The page will revalidate and remove this card
                setExpanded(false)
              }}
            />
          </div>
        </CardContent>
      )}
    </Card>
  )
}

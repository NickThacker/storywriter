'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { CharacterCard } from '@/components/story-bible/character-card'
import { LocationCard } from '@/components/story-bible/location-card'
import { WorldFactsList } from '@/components/story-bible/world-facts-list'
import { AddEntityDialog } from '@/components/story-bible/add-entity-dialog'
import type { CharacterRow, LocationRow, WorldFactRow } from '@/types/database'

interface BibleTabsProps {
  projectId: string
  characters: CharacterRow[]
  locations: LocationRow[]
  worldFacts: WorldFactRow[]
}

type EntityType = 'character' | 'location' | 'world-fact'

export function BibleTabs({ projectId, characters, locations, worldFacts }: BibleTabsProps) {
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [addEntityType, setAddEntityType] = useState<EntityType>('character')

  const timelineEvents = worldFacts.filter((f) => f.category === 'timeline')
  const otherFacts = worldFacts.filter((f) => f.category !== 'timeline')

  function openAddDialog(type: EntityType) {
    setAddEntityType(type)
    setAddDialogOpen(true)
  }

  return (
    <>
      <Tabs defaultValue="characters">
        <TabsList className="mb-4">
          <TabsTrigger value="characters">
            Characters
            {characters.length > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-xs">
                {characters.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="locations">
            Locations
            {locations.length > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-xs">
                {locations.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="timeline">
            Timeline
            {timelineEvents.length > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-xs">
                {timelineEvents.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="world-facts">
            World Facts
            {otherFacts.length > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-xs">
                {otherFacts.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Characters Tab */}
        <TabsContent value="characters">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {characters.length === 0
                  ? 'No characters yet. Add your first character.'
                  : `${characters.length} character${characters.length === 1 ? '' : 's'}`}
              </p>
              <Button size="sm" onClick={() => openAddDialog('character')}>
                <Plus className="h-4 w-4 mr-1" />
                Add Character
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {characters.map((character) => (
                <CharacterCard
                  key={character.id}
                  character={character}
                  projectId={projectId}
                />
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Locations Tab */}
        <TabsContent value="locations">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {locations.length === 0
                  ? 'No locations yet. Add your first location.'
                  : `${locations.length} location${locations.length === 1 ? '' : 's'}`}
              </p>
              <Button size="sm" onClick={() => openAddDialog('location')}>
                <Plus className="h-4 w-4 mr-1" />
                Add Location
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {locations.map((location) => (
                <LocationCard
                  key={location.id}
                  location={location}
                  projectId={projectId}
                />
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent value="timeline">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {timelineEvents.length === 0
                  ? 'No timeline events yet. Add your first event.'
                  : `${timelineEvents.length} event${timelineEvents.length === 1 ? '' : 's'}`}
              </p>
              <Button size="sm" onClick={() => openAddDialog('world-fact')}>
                <Plus className="h-4 w-4 mr-1" />
                Add Event
              </Button>
            </div>
            <WorldFactsList
              facts={timelineEvents}
              projectId={projectId}
              filterCategory="timeline"
            />
          </div>
        </TabsContent>

        {/* World Facts Tab */}
        <TabsContent value="world-facts">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {otherFacts.length === 0
                  ? 'No world facts yet. Add rules, lore, or relationships.'
                  : `${otherFacts.length} fact${otherFacts.length === 1 ? '' : 's'}`}
              </p>
              <Button size="sm" onClick={() => openAddDialog('world-fact')}>
                <Plus className="h-4 w-4 mr-1" />
                Add Fact
              </Button>
            </div>
            <WorldFactsList
              facts={otherFacts}
              projectId={projectId}
            />
          </div>
        </TabsContent>
      </Tabs>

      <AddEntityDialog
        projectId={projectId}
        entityType={addEntityType}
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onCreated={() => setAddDialogOpen(false)}
      />
    </>
  )
}

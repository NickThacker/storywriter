'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { CharacterRow, LocationRow, WorldFactCategory, ChangelogEntry } from '@/types/database'
import type { GeneratedOutline } from '@/lib/outline/schema'
import { syncStoryBibleToMemory } from '@/lib/memory/memory-updater'

// ──────────────────────────────────────────────────────────────────────────────
// Character actions
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Upsert a character for the story bible (CHAR-01 create, CHAR-02 edit).
 * - If character has `id`: updates existing row.
 * - If no `id`: inserts new row with source: 'manual'.
 */
export async function upsertCharacter(
  projectId: string,
  character: Partial<CharacterRow> & { name: string }
): Promise<{ success: true; id: string } | { error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: 'Unauthorized' }
  }

  // Verify project ownership
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: project, error: projectError } = await (supabase as any)
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .single()

  if (projectError || !project) {
    return { error: 'Project not found or access denied' }
  }

  if (character.id) {
    // Update existing character
    const { id, project_id: _pid, created_at: _ca, source: _source, ...updateFields } = character as CharacterRow
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('characters')
      .update(updateFields)
      .eq('id', id)
      .select('id')
      .single()

    if (error || !data) {
      return { error: (error as { message?: string })?.message ?? 'Failed to update character' }
    }

    // Sync cast/location lists to project_memory identity (fire-and-forget)
    void syncStoryBibleToMemory(projectId).catch((e) => console.error('[story-bible] sync error:', e))

    revalidatePath(`/projects/${projectId}/story-bible`)
    return { success: true, id: (data as { id: string }).id }
  } else {
    // Insert new character with source: 'manual'
    const { id: _id, ...insertFields } = character
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('characters')
      .insert({
        ...insertFields,
        project_id: projectId,
        source: 'manual',
      })
      .select('id')
      .single()

    if (error || !data) {
      return { error: (error as { message?: string })?.message ?? 'Failed to create character' }
    }

    // Sync cast/location lists to project_memory identity (fire-and-forget)
    void syncStoryBibleToMemory(projectId).catch((e) => console.error('[story-bible] sync error:', e))

    revalidatePath(`/projects/${projectId}/story-bible`)
    return { success: true, id: (data as { id: string }).id }
  }
}

/**
 * Delete a character by ID. Verifies ownership via project FK.
 */
export async function deleteCharacter(
  characterId: string
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: 'Unauthorized' }
  }

  // Get character with project for ownership verification
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: character, error: fetchError } = await (supabase as any)
    .from('characters')
    .select('id, project_id')
    .eq('id', characterId)
    .single()

  if (fetchError || !character) {
    return { error: 'Character not found' }
  }

  // Verify project ownership
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: project, error: projectError } = await (supabase as any)
    .from('projects')
    .select('id')
    .eq('id', (character as { project_id: string }).project_id)
    .eq('user_id', user.id)
    .single()

  if (projectError || !project) {
    return { error: 'Access denied' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('characters')
    .delete()
    .eq('id', characterId)

  if (error) {
    return { error: (error as { message?: string })?.message ?? 'Failed to delete character' }
  }

  const projectId = (character as { project_id: string }).project_id
  revalidatePath(`/projects/${projectId}/story-bible`)
  return { success: true }
}

// ──────────────────────────────────────────────────────────────────────────────
// Location actions
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Upsert a location for the story bible.
 */
export async function upsertLocation(
  projectId: string,
  location: Partial<LocationRow> & { name: string }
): Promise<{ success: true; id: string } | { error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: 'Unauthorized' }
  }

  // Verify project ownership
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: project, error: projectError } = await (supabase as any)
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .single()

  if (projectError || !project) {
    return { error: 'Project not found or access denied' }
  }

  if (location.id) {
    // Strip immutable fields; preserve source (don't let callers change ai→manual)
    const { id, project_id: _pid, created_at: _ca, source: _source, changelog: _cl, ...updateFields } = location as LocationRow
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('locations')
      .update(updateFields)
      .eq('id', id)
      .select('id')
      .single()

    if (error || !data) {
      return { error: (error as { message?: string })?.message ?? 'Failed to update location' }
    }

    void syncStoryBibleToMemory(projectId).catch((e) => console.error('[story-bible] sync error:', e))
    revalidatePath(`/projects/${projectId}/story-bible`)
    return { success: true, id: (data as { id: string }).id }
  } else {
    const { id: _id, ...insertFields } = location
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('locations')
      .insert({
        ...insertFields,
        project_id: projectId,
        source: 'manual',
      })
      .select('id')
      .single()

    if (error || !data) {
      return { error: (error as { message?: string })?.message ?? 'Failed to create location' }
    }

    void syncStoryBibleToMemory(projectId).catch((e) => console.error('[story-bible] sync error:', e))
    revalidatePath(`/projects/${projectId}/story-bible`)
    return { success: true, id: (data as { id: string }).id }
  }
}

/**
 * Delete a location by ID. Verifies ownership via project FK.
 */
export async function deleteLocation(
  locationId: string
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: 'Unauthorized' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: location, error: fetchError } = await (supabase as any)
    .from('locations')
    .select('id, project_id')
    .eq('id', locationId)
    .single()

  if (fetchError || !location) {
    return { error: 'Location not found' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: project, error: projectError } = await (supabase as any)
    .from('projects')
    .select('id')
    .eq('id', (location as { project_id: string }).project_id)
    .eq('user_id', user.id)
    .single()

  if (projectError || !project) {
    return { error: 'Access denied' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('locations')
    .delete()
    .eq('id', locationId)

  if (error) {
    return { error: (error as { message?: string })?.message ?? 'Failed to delete location' }
  }

  const projectId = (location as { project_id: string }).project_id
  revalidatePath(`/projects/${projectId}/story-bible`)
  return { success: true }
}

// ──────────────────────────────────────────────────────────────────────────────
// World Fact actions
// ──────────────────────────────────────────────────────────────────────────────

const VALID_CATEGORIES: WorldFactCategory[] = ['timeline', 'rule', 'lore', 'relationship']

/**
 * Upsert a world fact for the story bible.
 */
export async function upsertWorldFact(
  projectId: string,
  fact: { category: string; fact: string; id?: string }
): Promise<{ success: true; id: string } | { error: string }> {
  // Validate category
  if (!VALID_CATEGORIES.includes(fact.category as WorldFactCategory)) {
    return { error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}` }
  }

  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: 'Unauthorized' }
  }

  // Verify project ownership
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: project, error: projectError } = await (supabase as any)
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .single()

  if (projectError || !project) {
    return { error: 'Project not found or access denied' }
  }

  if (fact.id) {
    // Update existing fact
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('world_facts')
      .update({
        category: fact.category as WorldFactCategory,
        fact: fact.fact,
      })
      .eq('id', fact.id)
      .select('id')
      .single()

    if (error || !data) {
      return { error: (error as { message?: string })?.message ?? 'Failed to update world fact' }
    }

    revalidatePath(`/projects/${projectId}/story-bible`)
    return { success: true, id: (data as { id: string }).id }
  } else {
    // Insert new fact
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('world_facts')
      .insert({
        project_id: projectId,
        category: fact.category as WorldFactCategory,
        fact: fact.fact,
      })
      .select('id')
      .single()

    if (error || !data) {
      return { error: (error as { message?: string })?.message ?? 'Failed to create world fact' }
    }

    revalidatePath(`/projects/${projectId}/story-bible`)
    return { success: true, id: (data as { id: string }).id }
  }
}

/**
 * Delete a world fact by ID. Verifies ownership via project FK.
 */
export async function deleteWorldFact(
  factId: string
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: 'Unauthorized' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: fact, error: fetchError } = await (supabase as any)
    .from('world_facts')
    .select('id, project_id')
    .eq('id', factId)
    .single()

  if (fetchError || !fact) {
    return { error: 'World fact not found' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: project, error: projectError } = await (supabase as any)
    .from('projects')
    .select('id')
    .eq('id', (fact as { project_id: string }).project_id)
    .eq('user_id', user.id)
    .single()

  if (projectError || !project) {
    return { error: 'Access denied' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('world_facts')
    .delete()
    .eq('id', factId)

  if (error) {
    return { error: (error as { message?: string })?.message ?? 'Failed to delete world fact' }
  }

  const projectId = (fact as { project_id: string }).project_id
  revalidatePath(`/projects/${projectId}/story-bible`)
  return { success: true }
}

// ──────────────────────────────────────────────────────────────────────────────
// seedStoryBibleFromOutline (OUTL-05)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Populate the story bible from a generated outline.
 *
 * Characters:
 *   - Manual characters: update only null fields (preserve user edits).
 *   - AI characters: full update + append changelog entry.
 *   - New characters: insert with source: 'ai'.
 *
 * Locations:
 *   - Delete only AI-generated locations (source: 'ai'). Manual locations preserved.
 *   - Insert fresh from outline with source: 'ai'.
 *
 * World facts:
 *   - Delete existing AI-generated world facts.
 *   - Seed from outline premise + project intake_data (genre, themes, setting).
 *
 * Called from approveOutline after the outline status is set to 'approved'.
 */
export async function seedStoryBibleFromOutline(
  projectId: string,
  outlineData: GeneratedOutline
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: 'Unauthorized' }
  }

  // Verify project ownership and fetch intake_data for world facts seeding
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: project, error: projectError } = await (supabase as any)
    .from('projects')
    .select('id, intake_data')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .single()

  if (projectError || !project) {
    return { error: 'Project not found or access denied' }
  }

  const now = new Date().toISOString()
  const seedEntry: ChangelogEntry = { at: now, by: 'ai', note: 'Seeded from outline approval' }
  const reSeedEntry: ChangelogEntry = { at: now, by: 'ai', note: 'Updated from re-approved outline' }

  // ── Characters ────────────────────────────────────────────────────────────

  for (const outlineCharacter of outlineData.characters) {
    const { name, role, one_line, arc } = outlineCharacter

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing, error: fetchError } = await (supabase as any)
      .from('characters')
      .select('id, source, one_line, arc, changelog')
      .eq('project_id', projectId)
      .eq('name', name)
      .maybeSingle()

    if (fetchError) {
      return { error: `Failed to look up character "${name}": ${(fetchError as { message?: string }).message ?? 'unknown error'}` }
    }

    if (existing) {
      const existingRow = existing as {
        id: string
        source: 'ai' | 'manual'
        one_line: string | null
        arc: string | null
        changelog: ChangelogEntry[]
      }

      if (existingRow.source === 'manual') {
        // Preserve manual edits — only fill in null fields
        const updateFields: Record<string, unknown> = {}
        if (existingRow.one_line === null && one_line) updateFields.one_line = one_line
        if (existingRow.arc === null && arc) updateFields.arc = arc

        if (Object.keys(updateFields).length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { error: updateError } = await (supabase as any)
            .from('characters')
            .update({ ...updateFields, updated_at: now })
            .eq('id', existingRow.id)

          if (updateError) {
            return { error: `Failed to update manual character "${name}": ${(updateError as { message?: string }).message ?? 'unknown error'}` }
          }
        }
      } else {
        // source === 'ai' — full update, append changelog
        const updatedChangelog = [...(existingRow.changelog ?? []), reSeedEntry]
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: updateError } = await (supabase as any)
          .from('characters')
          .update({
            role: role ?? 'supporting',
            one_line: one_line ?? null,
            arc: arc ?? null,
            changelog: updatedChangelog,
            updated_at: now,
          })
          .eq('id', existingRow.id)

        if (updateError) {
          return { error: `Failed to update AI character "${name}": ${(updateError as { message?: string }).message ?? 'unknown error'}` }
        }
      }
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: insertError } = await (supabase as any)
        .from('characters')
        .insert({
          project_id: projectId,
          name,
          role: role ?? 'supporting',
          one_line: one_line ?? null,
          arc: arc ?? null,
          appearance: null,
          backstory: null,
          personality: null,
          voice: null,
          motivations: null,
          source: 'ai',
          changelog: [seedEntry],
        })

      if (insertError) {
        return { error: `Failed to insert character "${name}": ${(insertError as { message?: string }).message ?? 'unknown error'}` }
      }
    }
  }

  // ── Locations ─────────────────────────────────────────────────────────────
  // Delete only AI-generated locations; manual entries are preserved.

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: deleteLocError } = await (supabase as any)
    .from('locations')
    .delete()
    .eq('project_id', projectId)
    .eq('source', 'ai')

  if (deleteLocError) {
    return { error: `Failed to clear AI locations: ${(deleteLocError as { message?: string }).message ?? 'unknown error'}` }
  }

  for (const outlineLocation of outlineData.locations) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: insertError } = await (supabase as any)
      .from('locations')
      .insert({
        project_id: projectId,
        name: outlineLocation.name,
        description: outlineLocation.description ?? null,
        significance: null,
        source: 'ai',
        changelog: [seedEntry],
      })

    if (insertError) {
      return { error: `Failed to insert location "${outlineLocation.name}": ${(insertError as { message?: string }).message ?? 'unknown error'}` }
    }
  }

  // ── World Facts ───────────────────────────────────────────────────────────
  // Delete existing AI-generated world facts, then re-seed from outline + intake_data.

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: deleteFactsError } = await (supabase as any)
    .from('world_facts')
    .delete()
    .eq('project_id', projectId)
    .eq('source', 'ai')

  if (deleteFactsError) {
    return { error: `Failed to clear AI world facts: ${(deleteFactsError as { message?: string }).message ?? 'unknown error'}` }
  }

  // Build world facts from premise + intake_data (genre, themes, setting)
  const intake = (project as { intake_data: Record<string, unknown> | null }).intake_data ?? {}
  const worldFactsToSeed: { category: 'lore' | 'timeline' | 'rule' | 'relationship'; fact: string }[] = []

  // Premise
  if (outlineData.premise) {
    worldFactsToSeed.push({ category: 'lore', fact: `Premise: ${outlineData.premise}` })
  }

  // Genre
  const genre = intake.genre as string | null
  if (genre) {
    worldFactsToSeed.push({ category: 'lore', fact: `Genre: ${genre}` })
  }

  // Setting
  const setting = intake.setting as string | null
  if (setting) {
    worldFactsToSeed.push({ category: 'lore', fact: `Setting: ${setting}` })
  }

  // Themes (one fact per theme)
  const themes = intake.themes as string[] | null
  if (Array.isArray(themes)) {
    for (const theme of themes) {
      if (theme) {
        worldFactsToSeed.push({ category: 'lore', fact: `Theme: ${theme}` })
      }
    }
  }

  for (const { category, fact } of worldFactsToSeed) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: insertError } = await (supabase as any)
      .from('world_facts')
      .insert({
        project_id: projectId,
        category,
        fact,
        source: 'ai',
        changelog: [seedEntry],
      })

    if (insertError) {
      return { error: `Failed to insert world fact: ${(insertError as { message?: string }).message ?? 'unknown error'}` }
    }
  }

  revalidatePath(`/projects/${projectId}/story-bible`)
  return { success: true }
}

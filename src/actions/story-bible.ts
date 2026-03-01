'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { CharacterRow, LocationRow, WorldFactCategory } from '@/types/database'

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
    const { id, project_id: _pid, created_at: _ca, ...updateFields } = location as LocationRow
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
      })
      .select('id')
      .single()

    if (error || !data) {
      return { error: (error as { message?: string })?.message ?? 'Failed to create location' }
    }

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

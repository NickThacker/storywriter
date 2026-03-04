// TypeScript types matching the Supabase database schema.
// These follow Supabase's generated types pattern with Row, Insert, and Update variants.

import type {
  ProjectMemoryRow,
  ProjectMemoryInsert,
  ProjectMemoryUpdate,
  ChapterCheckpointRow,
  ChapterCheckpointInsert,
  ChapterCheckpointUpdate,
} from '@/types/project-memory'

import type {
  TokenUsageRow,
  TokenUsageInsert,
  TokenUsageUpdate,
  StripeWebhookEventRow,
} from '@/types/billing'

export type ProjectStatus = 'draft' | 'writing' | 'complete'
export type SubscriptionTier = 'none' | 'hosted' | 'starter' | 'writer' | 'pro'
export type TaskType = 'outline' | 'prose' | 'editing'

// ------- Phase 2 story bible enum types -------

export type CharacterRole = 'protagonist' | 'antagonist' | 'supporting' | 'minor'
export type CharacterSource = 'ai' | 'manual'
export type WorldFactCategory = 'timeline' | 'rule' | 'lore' | 'relationship'
export type OutlineStatus = 'draft' | 'approved'
export type BeatSheetId = 'save-the-cat' | 'three-act' | 'heros-journey' | 'romancing-the-beat'
export type NovelLength = 'short' | 'standard' | 'epic'

// ------- Row types (what you get back from SELECT) -------

export interface UserSettingsRow {
  id: string
  user_id: string
  openrouter_api_key: string | null
  subscription_tier: SubscriptionTier
  created_at: string
  updated_at: string
  // Phase 5 billing fields
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  token_budget_total: number
  token_budget_remaining: number
  credit_pack_tokens: number
  billing_period_end: string | null
}

export interface UserModelPreferenceRow {
  id: string
  user_id: string
  task_type: TaskType
  model_id: string
  updated_at: string
}

export interface ProjectRow {
  id: string
  user_id: string
  title: string
  status: ProjectStatus
  genre: string | null
  word_count: number
  chapter_count: number
  chapters_done: number
  story_bible: Record<string, unknown>
  intake_data: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

// ------- Phase 2 story bible row types -------

export interface OutlineChapter {
  number: number
  title: string
  summary: string
  beats: string[]
  characters_featured: string[]
  beat_sheet_mapping: string
  act: number
}

export interface CharacterRow {
  id: string
  project_id: string
  name: string
  role: CharacterRole
  one_line: string | null
  appearance: string | null
  backstory: string | null
  personality: string | null
  voice: string | null
  motivations: string | null
  arc: string | null
  source: CharacterSource
  created_at: string
  updated_at: string
}

export interface LocationRow {
  id: string
  project_id: string
  name: string
  description: string | null
  significance: string | null
  created_at: string
  updated_at: string
}

export interface WorldFactRow {
  id: string
  project_id: string
  category: WorldFactCategory
  fact: string
  created_at: string
  updated_at: string
}

export interface OutlineRow {
  id: string
  project_id: string
  beat_sheet_id: BeatSheetId
  target_length: NovelLength
  chapter_count: number
  chapters: OutlineChapter[]
  previous_chapters: OutlineChapter[] | null
  status: OutlineStatus
  approved_at: string | null
  created_at: string
  updated_at: string
}

// ------- Insert types (what you send for INSERT — id/created_at are optional) -------

export type UserSettingsInsert = Omit<UserSettingsRow, 'id' | 'created_at' | 'updated_at'> & {
  id?: string
  created_at?: string
  updated_at?: string
  stripe_customer_id?: string | null
  stripe_subscription_id?: string | null
  token_budget_total?: number
  token_budget_remaining?: number
  credit_pack_tokens?: number
  billing_period_end?: string | null
}

export type UserModelPreferenceInsert = Omit<UserModelPreferenceRow, 'id' | 'updated_at'> & {
  id?: string
  updated_at?: string
}

export type ProjectInsert = Omit<ProjectRow, 'id' | 'created_at' | 'updated_at'> & {
  id?: string
  title?: string
  status?: ProjectStatus
  genre?: string | null
  word_count?: number
  chapter_count?: number
  chapters_done?: number
  story_bible?: Record<string, unknown>
  intake_data?: Record<string, unknown> | null
  created_at?: string
  updated_at?: string
}

// ------- Phase 2 insert types -------

export type CharacterInsert = Omit<CharacterRow, 'id' | 'created_at' | 'updated_at'> & {
  id?: string
  one_line?: string | null
  appearance?: string | null
  backstory?: string | null
  personality?: string | null
  voice?: string | null
  motivations?: string | null
  arc?: string | null
  source?: CharacterSource
  created_at?: string
  updated_at?: string
}

export type LocationInsert = Omit<LocationRow, 'id' | 'created_at' | 'updated_at'> & {
  id?: string
  description?: string | null
  significance?: string | null
  created_at?: string
  updated_at?: string
}

export type WorldFactInsert = Omit<WorldFactRow, 'id' | 'created_at' | 'updated_at'> & {
  id?: string
  created_at?: string
  updated_at?: string
}

export type OutlineInsert = Omit<OutlineRow, 'id' | 'created_at' | 'updated_at'> & {
  id?: string
  chapters?: OutlineChapter[]
  previous_chapters?: OutlineChapter[] | null
  status?: OutlineStatus
  approved_at?: string | null
  created_at?: string
  updated_at?: string
}

// ------- Update types (all fields optional for PATCH-style updates) -------

export type UserSettingsUpdate = Partial<
  Omit<UserSettingsRow, 'id' | 'user_id' | 'created_at'>
>

export type UserModelPreferenceUpdate = Partial<
  Omit<UserModelPreferenceRow, 'id' | 'user_id' | 'task_type'>
>

export type ProjectUpdate = Partial<
  Omit<ProjectRow, 'id' | 'user_id' | 'created_at'>
>

// ------- Phase 2 update types -------

export type CharacterUpdate = Partial<
  Omit<CharacterRow, 'id' | 'project_id' | 'created_at'>
>

export type LocationUpdate = Partial<
  Omit<LocationRow, 'id' | 'project_id' | 'created_at'>
>

export type WorldFactUpdate = Partial<
  Omit<WorldFactRow, 'id' | 'project_id' | 'created_at'>
>

export type OutlineUpdate = Partial<
  Omit<OutlineRow, 'id' | 'project_id' | 'created_at'>
>

// ------- Supabase Relationship type (used in Database generic) -------

export type GenericRelationship = {
  foreignKeyName: string
  columns: string[]
  isOneToOne: boolean
  referencedRelation: string
  referencedColumns: string[]
}

// ------- Supabase Database type (used as generic parameter for createClient) -------
// Format follows the supabase-js v2 generated types convention for PostgREST v12

export type Database = {
  public: {
    Tables: {
      user_settings: {
        Row: UserSettingsRow
        Insert: UserSettingsInsert
        Update: UserSettingsUpdate
        Relationships: GenericRelationship[]
      }
      user_model_preferences: {
        Row: UserModelPreferenceRow
        Insert: UserModelPreferenceInsert
        Update: UserModelPreferenceUpdate
        Relationships: GenericRelationship[]
      }
      projects: {
        Row: ProjectRow
        Insert: ProjectInsert
        Update: ProjectUpdate
        Relationships: GenericRelationship[]
      }
      characters: {
        Row: CharacterRow
        Insert: CharacterInsert
        Update: CharacterUpdate
        Relationships: GenericRelationship[]
      }
      locations: {
        Row: LocationRow
        Insert: LocationInsert
        Update: LocationUpdate
        Relationships: GenericRelationship[]
      }
      world_facts: {
        Row: WorldFactRow
        Insert: WorldFactInsert
        Update: WorldFactUpdate
        Relationships: GenericRelationship[]
      }
      outlines: {
        Row: OutlineRow
        Insert: OutlineInsert
        Update: OutlineUpdate
        Relationships: GenericRelationship[]
      }
      project_memory: {
        Row: ProjectMemoryRow
        Insert: ProjectMemoryInsert
        Update: ProjectMemoryUpdate
        Relationships: GenericRelationship[]
      }
      chapter_checkpoints: {
        Row: ChapterCheckpointRow
        Insert: ChapterCheckpointInsert
        Update: ChapterCheckpointUpdate
        Relationships: GenericRelationship[]
      }
      token_usage: {
        Row: TokenUsageRow
        Insert: TokenUsageInsert
        Update: TokenUsageUpdate
        Relationships: GenericRelationship[]
      }
      stripe_webhook_events: {
        Row: StripeWebhookEventRow
        Insert: Omit<StripeWebhookEventRow, 'processed_at'> & { processed_at?: string }
        Update: Partial<StripeWebhookEventRow>
        Relationships: GenericRelationship[]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// ------- Convenience aliases (used throughout the codebase) -------

export type UserSettings = UserSettingsRow
export type UserModelPreference = UserModelPreferenceRow
export type Project = ProjectRow

// ------- Phase 2 convenience aliases -------

export type Character = CharacterRow
export type Location = LocationRow
export type WorldFact = WorldFactRow
export type Outline = OutlineRow

// ------- Phase 3 convenience aliases -------

export type ProjectMemory = ProjectMemoryRow
export type ChapterCheckpoint = ChapterCheckpointRow

// ------- Phase 5 convenience aliases -------

export type { TokenUsageRow, TokenUsageInsert, TokenUsageUpdate } from '@/types/billing'
export type TokenUsage = TokenUsageRow

// TypeScript types matching the Supabase database schema.
// These follow Supabase's generated types pattern with Row, Insert, and Update variants.

export type ProjectStatus = 'draft' | 'writing' | 'complete'
export type SubscriptionTier = 'none' | 'hosted'
export type TaskType = 'outline' | 'prose' | 'editing'

// ------- Row types (what you get back from SELECT) -------

export interface UserSettingsRow {
  id: string
  user_id: string
  openrouter_api_key: string | null
  subscription_tier: SubscriptionTier
  created_at: string
  updated_at: string
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
  created_at: string
  updated_at: string
}

// ------- Insert types (what you send for INSERT — id/created_at are optional) -------

export type UserSettingsInsert = Omit<UserSettingsRow, 'id' | 'created_at' | 'updated_at'> & {
  id?: string
  created_at?: string
  updated_at?: string
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
